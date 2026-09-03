import { describe, expect, it } from "vitest";

import {
  AUTO_ATTACK_DAMAGE,
  AUTO_ATTACK_PERIOD_TICKS,
  BASE_SPEED,
  INITIAL_ENEMY_HP,
  INITIAL_MEMBER_HP,
  SPECIAL_GAUGE_PER_TICK,
  SWITCH_STUN_MS,
  TIMEOUT_MS,
  computeAttackDamage,
  msToTicks,
  shouldAutoAttack,
  type AutoAttackSide,
} from "./battle.constants";
import { applySetStance } from "./battle-commands";
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
    next = applyBattleTick(next, 0);
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
    const firstKo = applyBattleTick(
      {
        ...started,
        elapsedTicks: AUTO_ATTACK_PERIOD_TICKS - 1,
        party: [
          { ...started.party![0], hp: 1 },
          started.party![1],
          started.party![2],
        ],
      },
      0,
    );

    expect(firstKo.status).toBe("active");
    expect(firstKo.activeIndex).toBe(1);
    expect(firstKo.party?.[0].hp).toBe(0);
    expect(firstKo.playerGauge).toBe(0);
    expect(firstKo.switchStunTicks).toBe(msToTicks(SWITCH_STUN_MS));

    const wiped = applyBattleTick(
      {
        ...started,
        elapsedTicks: AUTO_ATTACK_PERIOD_TICKS - 1,
        party: [
          { ...started.party![0], hp: 1 },
          { ...started.party![1], hp: 0 },
          { ...started.party![2], hp: 0 },
        ],
      },
      0,
    );
    expect(wiped.status).toBe("defeated");
  });

  it("タイムアップは残HPが多い側が勝つ", () => {
    const started = applyBattleStart(startInput);
    const won = applyBattleTick(started, TIMEOUT_MS);
    expect(won.status).toBe("completing");

    const lost = applyBattleTick(
      {
        ...started,
        party: [
          { ...started.party![0], hp: 10 },
          { ...started.party![1], hp: 0 },
          { ...started.party![2], hp: 0 },
        ],
        enemy: { ...started.enemy!, hp: 400 },
      },
      TIMEOUT_MS,
    );
    expect(lost.status).toBe("defeated");
  });
});
