import { describe, expect, it } from "vitest";

import {
  AUTO_ATTACK_DAMAGE,
  AUTO_ATTACK_PERIOD_TICKS,
  BASE_SPEED,
  BENCH_HP_RECOVERY_RATE,
  GUARD_DURATION_MS,
  INITIAL_ENEMY_HP,
  INITIAL_MEMBER_HP,
  SPECIAL_GAUGE_MAX,
  SPECIAL_GAUGE_PER_TICK,
  SWITCH_COOLDOWN_TICKS,
  SWITCH_STUN_MS,
  TIMEOUT_TICKS,
  computeAttackDamage,
  guardCooldownTicks,
  msToTicks,
  shouldAutoAttack,
  type AutoAttackSide,
} from "./battle.constants";
import { applySetStance, applySwitchMember } from "./battle-commands";
import { applyBattleStart, applyBattleTick } from "./battle-runtime";
import type { BattleSnapshot, BattleStartInput } from "./battle.types";

const startInput: BattleStartInput = {
  battleId: "battle-1",
  enemy: {
    characterId: "meat-1",
    attribute: "meat",
    hp: INITIAL_ENEMY_HP,
    power: AUTO_ATTACK_DAMAGE,
    speed: BASE_SPEED,
  },
  party: [
    {
      userCharacterId: null,
      characterId: "spicy-1",
      attribute: "spicy",
      hp: INITIAL_MEMBER_HP,
      power: AUTO_ATTACK_DAMAGE,
      speed: BASE_SPEED,
    },
    {
      userCharacterId: null,
      characterId: "normal-1",
      attribute: "normal",
      hp: INITIAL_MEMBER_HP,
      power: AUTO_ATTACK_DAMAGE,
      speed: BASE_SPEED,
    },
    {
      userCharacterId: null,
      characterId: "normal-2",
      attribute: "normal",
      hp: INITIAL_MEMBER_HP,
      power: AUTO_ATTACK_DAMAGE,
      speed: BASE_SPEED,
    },
  ],
  now: 0,
};

function tickTimes(state: BattleSnapshot, count: number): BattleSnapshot {
  let next = state;
  for (let index = 0; index < count; index += 1) {
    next = applyBattleTick(next);
  }
  return next;
}

function battleIdWithSwingsAt(
  tick: number,
  playerHit: boolean,
  enemyHit: boolean,
): string {
  for (let index = 0; index < 10_000; index += 1) {
    const battleId = `roll-${index}`;
    if (
      shouldAutoAttack(battleId, tick, "player") === playerHit &&
      shouldAutoAttack(battleId, tick, "enemy") === enemyHit
    ) {
      return battleId;
    }
  }

  throw new Error("auto-attack battleId が見つからない");
}

function battleIdWithSwingAt(side: AutoAttackSide, tick: number, shouldHit: boolean): string {
  for (let index = 0; index < 10_000; index += 1) {
    const battleId = `roll-${index}`;
    if (shouldAutoAttack(battleId, tick, side) === shouldHit) {
      return battleId;
    }
  }

  throw new Error("auto-attack battleId が見つからない");
}

function battleIdWithPlayerHitsAt(ticks: readonly number[]): string {
  for (let index = 0; index < 10_000; index += 1) {
    const battleId = `roll-${index}`;
    if (ticks.every((tick) => shouldAutoAttack(battleId, tick, "player"))) {
      return battleId;
    }
  }

  throw new Error("auto-attack battleId が見つからない");
}

function autoDamage(
  attackerAttribute: "spicy" | "meat",
  defenderAttribute: "spicy" | "meat",
): number {
  return computeAttackDamage({
    attackerAttribute,
    defenderAttribute,
    attackerStance: "fight",
    defenderStance: "fight",
    baseDamage: AUTO_ATTACK_DAMAGE,
  });
}

describe("applyBattleStart / applyBattleTick", () => {
  it("同じ入力列なら HP・ゲージ・stance が同じ結果になる", () => {
    const first = tickTimes(applySetStance(applyBattleStart(startInput), "guard"), 4);
    const second = tickTimes(applySetStance(applyBattleStart(startInput), "guard"), 4);

    expect(first).toEqual(second);
    expect(first.playerStance).toBe("guard");
    expect(first.playerGauge).toBe(SPECIAL_GAUGE_PER_TICK * 4);
  });

  it("通常攻撃は窓の外では入らず、当たる窓では大きい", () => {
    const period = AUTO_ATTACK_PERIOD_TICKS;
    const playerOnly = battleIdWithSwingsAt(period, true, false);
    const enemyOnly = battleIdWithSwingsAt(period, false, true);
    const bothMiss = battleIdWithSwingsAt(period, false, false);

    const beforeWindow = tickTimes(
      applyBattleStart({ ...startInput, battleId: playerOnly }),
      period - 1,
    );
    expect(beforeWindow.enemy?.hp).toBe(INITIAL_ENEMY_HP);
    expect(beforeWindow.party?.[0].hp).toBe(INITIAL_MEMBER_HP);

    const missed = tickTimes(
      applyBattleStart({ ...startInput, battleId: bothMiss }),
      period,
    );
    expect(missed.enemy?.hp).toBe(INITIAL_ENEMY_HP);
    expect(missed.party?.[0].hp).toBe(INITIAL_MEMBER_HP);

    const playerHit = tickTimes(
      applyBattleStart({ ...startInput, battleId: playerOnly }),
      period,
    );
    expect(playerHit.enemy?.hp).toBe(
      INITIAL_ENEMY_HP - autoDamage("spicy", "meat"),
    );
    expect(playerHit.party?.[0].hp).toBe(INITIAL_MEMBER_HP);

    const enemyHit = tickTimes(
      applyBattleStart({ ...startInput, battleId: enemyOnly }),
      period,
    );
    expect(enemyHit.enemy?.hp).toBe(INITIAL_ENEMY_HP);
    expect(enemyHit.party?.[0].hp).toBe(
      INITIAL_MEMBER_HP - autoDamage("meat", "spicy"),
    );
  });

  it("無操作なら殴り、ガード中は殴らず、ガード終了後はまた自動で殴る", () => {
    const firstSwingTick = AUTO_ATTACK_PERIOD_TICKS;
    const afterGuardSwingTick = msToTicks(GUARD_DURATION_MS) +
      AUTO_ATTACK_PERIOD_TICKS;
    const battleId = battleIdWithPlayerHitsAt([
      firstSwingTick,
      afterGuardSwingTick,
    ]);
    const damage = autoDamage("spicy", "meat");

    const idle = tickTimes(
      applyBattleStart({ ...startInput, battleId }),
      firstSwingTick,
    );
    expect(idle.enemy?.hp).toBe(INITIAL_ENEMY_HP - damage);

    const guardStarted = applySetStance(
      applyBattleStart({ ...startInput, battleId }),
      "guard",
    );
    const guarding = tickTimes(guardStarted, firstSwingTick);
    expect(guarding.enemy?.hp).toBe(INITIAL_ENEMY_HP);

    const guardExpired = tickTimes(guardStarted, msToTicks(GUARD_DURATION_MS));
    expect(guardExpired.playerStance).toBe("fight");
    expect(guardExpired.enemy?.hp).toBe(INITIAL_ENEMY_HP);
    expect(guardExpired.playerGuardCooldownTicks).toBe(
      guardCooldownTicks(BASE_SPEED),
    );

    const returnedToAuto = tickTimes(guardExpired, AUTO_ATTACK_PERIOD_TICKS);
    expect(returnedToAuto.enemy?.hp).toBe(INITIAL_ENEMY_HP - damage);
  });

  it("敵のガードも5秒で解け、敵の Speed でクールに入る", () => {
    const started = applyBattleStart({
      ...startInput,
      enemy: { ...startInput.enemy, speed: 40 },
    });
    const guardingEnemy: BattleSnapshot = {
      ...started,
      enemyStance: "guard",
      enemyGuardRemainingTicks: msToTicks(GUARD_DURATION_MS),
    };

    const expired = tickTimes(guardingEnemy, msToTicks(GUARD_DURATION_MS));
    expect(expired.enemyStance).toBe("fight");
    expect(expired.enemyGuardRemainingTicks).toBe(0);
    expect(expired.enemyGuardCooldownTicks).toBe(guardCooldownTicks(40));
  });

  it("控えは場に出るまでダメージを受けない", () => {
    const battleId = battleIdWithSwingAt(
      "enemy",
      AUTO_ATTACK_PERIOD_TICKS,
      true,
    );
    const after = tickTimes(
      applyBattleStart({ ...startInput, battleId }),
      AUTO_ATTACK_PERIOD_TICKS,
    );

    expect(after.party?.[0].hp).toBeLessThan(INITIAL_MEMBER_HP);
    expect(after.party?.[1].hp).toBe(INITIAL_MEMBER_HP);
    expect(after.party?.[2].hp).toBe(INITIAL_MEMBER_HP);
  });

  it("場の一体が倒れたらベンチ先頭が出て、3体とも倒されたら敗北する", () => {
    const battleId = battleIdWithSwingAt(
      "enemy",
      AUTO_ATTACK_PERIOD_TICKS,
      true,
    );
    const started = applyBattleStart({ ...startInput, battleId });
    const firstKo = applyBattleTick({
      ...started,
      elapsedTicks: AUTO_ATTACK_PERIOD_TICKS - 1,
      party: [
        { ...started.party![0], hp: 1 },
        started.party![1],
        started.party![2],
      ],
    });

    expect(firstKo.status).toBe("active");
    expect(firstKo.activeIndex).toBe(1);
    expect(firstKo.party?.[0].hp).toBe(0);
    expect(firstKo.playerGauge).toBe(0);
    expect(firstKo.switchStunTicks).toBe(msToTicks(SWITCH_STUN_MS));
    expect(firstKo.switchCooldownTicks).toBe(SWITCH_COOLDOWN_TICKS);

    const wiped = applyBattleTick({
      ...started,
      elapsedTicks: AUTO_ATTACK_PERIOD_TICKS - 1,
      party: [
        { ...started.party![0], hp: 1 },
        { ...started.party![1], hp: 0 },
        { ...started.party![2], hp: 0 },
      ],
    });
    expect(wiped.status).toBe("defeated");
  });

  it("タイムアップは1体でも残っていれば完了し、3体全滅だけ敗北する", () => {
    const started = applyBattleStart(startInput);
    const beforeTimeout = applyBattleTick({
      ...started,
      elapsedTicks: TIMEOUT_TICKS - 1,
    });
    expect(beforeTimeout.status).toBe("active");

    const survived = applyBattleTick({
      ...started,
      elapsedTicks: TIMEOUT_TICKS,
    });
    expect(survived.status).toBe("completing");

    // 1体戦闘不能 + 2体目半分 + 敵HPが高い。旧実装は残HP割合で敗北にしていた。
    const oneKoHalfHp = applyBattleTick({
      ...started,
      elapsedTicks: TIMEOUT_TICKS,
      party: [
        { ...started.party![0], hp: 0 },
        { ...started.party![1], hp: Math.floor(INITIAL_MEMBER_HP / 2) },
        started.party![2],
      ],
      enemy: { ...started.enemy!, hp: 400 },
    });
    expect(oneKoHalfHp.status).toBe("completing");

    const lastMemberLowHp = applyBattleTick({
      ...started,
      elapsedTicks: TIMEOUT_TICKS,
      party: [
        { ...started.party![0], hp: 10 },
        { ...started.party![1], hp: 0 },
        { ...started.party![2], hp: 0 },
      ],
      enemy: { ...started.enemy!, hp: 400 },
    });
    expect(lastMemberLowHp.status).toBe("completing");

    const wiped = applyBattleTick({
      ...started,
      elapsedTicks: TIMEOUT_TICKS,
      party: [
        { ...started.party![0], hp: 0 },
        { ...started.party![1], hp: 0 },
        { ...started.party![2], hp: 0 },
      ],
      enemy: { ...started.enemy!, hp: 400 },
    });
    expect(wiped.status).toBe("defeated");
  });

  describe("ベンチ回復", () => {
    it("ベンチの味方HPが毎ティック回復し、場の味方HPは回復しない", () => {
      const started = applyBattleStart(startInput);
      // ベンチの味方にダメージを与えた状態を作る
      const damaged: BattleSnapshot = {
        ...started,
        party: [
          started.party![0], // 場（activeIndex=0）
          { ...started.party![1], hp: 100 }, // ベンチ: ダメージを受けた状態
          { ...started.party![2], hp: 100 }, // ベンチ: ダメージを受けた状態
        ],
      };

      const afterOneTick = applyBattleTick(damaged);
      const hpRecovery = Math.max(1, Math.floor(INITIAL_MEMBER_HP * BENCH_HP_RECOVERY_RATE));

      // 場の味方はベンチ回復しない
      expect(afterOneTick.party![0].hp).toBe(started.party![0].hp);
      // ベンチの味方は回復する
      expect(afterOneTick.party![1].hp).toBe(100 + hpRecovery);
      expect(afterOneTick.party![2].hp).toBe(100 + hpRecovery);
    });

    it("戦闘不能のキャラはベンチ回復しない", () => {
      const started = applyBattleStart(startInput);
      const withKo: BattleSnapshot = {
        ...started,
        party: [
          started.party![0],
          { ...started.party![1], hp: 0 }, // 戦闘不能
          { ...started.party![2], hp: 100 },
        ],
      };

      const afterOneTick = applyBattleTick(withKo);
      expect(afterOneTick.party![1].hp).toBe(0);
      expect(afterOneTick.party![2].hp).toBeGreaterThan(100);
    });

    it("HPはmaxHpを超えない", () => {
      const started = applyBattleStart(startInput);
      // maxHpと同じHPの味方はそれ以上回復しない
      const afterOneTick = applyBattleTick(started);
      expect(afterOneTick.party![1].hp).toBe(started.party![1].maxHp);
      expect(afterOneTick.party![2].hp).toBe(started.party![2].maxHp);
    });

    it("ベンチの必殺ゲージは時間経過で増えず、場の味方と敵のゲージだけ増える", () => {
      const started = applyBattleStart(startInput);
      const after10 = tickTimes(started, 10);

      expect(after10.playerGauge).toBe(SPECIAL_GAUGE_PER_TICK * 10);
      expect(after10.enemyGauge).toBe(SPECIAL_GAUGE_PER_TICK * 10);
      expect(after10.benchGauges[0]).toBe(0);
      expect(after10.benchGauges[1]).toBe(0);
      expect(after10.benchGauges[2]).toBe(0);
    });

    it("交代で退場した味方とベンチから出た味方の必殺ゲージは0になる", () => {
      const started = applyBattleStart(startInput);
      const charged: BattleSnapshot = {
        ...tickTimes(started, 10),
        benchGauges: [0, SPECIAL_GAUGE_MAX, 40],
      };

      const switched = applySwitchMember(charged, 1);
      expect(charged.playerGauge).toBe(SPECIAL_GAUGE_PER_TICK * 10);
      expect(switched.activeIndex).toBe(1);
      expect(switched.playerGauge).toBe(0);
      expect(switched.benchGauges[0]).toBe(0);
      expect(switched.benchGauges[1]).toBe(0);
      expect(switched.benchGauges[2]).toBe(0);
    });

    it("戦闘不能による自動交代でもベンチから出た味方の必殺ゲージは0になる", () => {
      const battleId = battleIdWithSwingAt(
        "enemy",
        AUTO_ATTACK_PERIOD_TICKS,
        true,
      );
      const started = applyBattleStart({ ...startInput, battleId });
      const knockedOut = applyBattleTick({
        ...started,
        elapsedTicks: AUTO_ATTACK_PERIOD_TICKS - 1,
        playerGauge: SPECIAL_GAUGE_MAX,
        benchGauges: [0, SPECIAL_GAUGE_MAX, 40],
        party: [
          { ...started.party![0], hp: 1 },
          started.party![1],
          started.party![2],
        ],
      });

      expect(knockedOut.status).toBe("active");
      expect(knockedOut.activeIndex).toBe(1);
      expect(knockedOut.playerGauge).toBe(0);
      expect(knockedOut.benchGauges).toEqual([0, 0, 0]);
    });
  });
});
