import { describe, expect, it } from "vitest";

import {
  AUTO_ATTACK_DAMAGE,
  AUTO_ATTACK_PERIOD_TICKS,
  BASE_SPEED,
  GUARD_DURATION_MS,
  INITIAL_ENEMY_HP,
  INITIAL_MEMBER_HP,
  SPECIAL_GAUGE_MAX,
  SWITCH_STUN_MS,
  computeAttackDamage,
  guardCooldownTicks,
  msToTicks,
  shouldAutoAttack,
  specialChargeTicks,
} from "./battle.constants";
import {
  applyBeginSpecial,
  applyFireSpecial,
  applyMarkCompleting,
  applyMarkDefeated,
  applySetBowelDraft,
  applySetStance,
  applySwitchMember,
} from "./battle-commands";
import { applyBattleStart, applyBattleTick } from "./battle-runtime";
import { IDLE_BATTLE_SNAPSHOT } from "./battle-snapshot";
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

describe("まもれ", () => {
  it("被ダメを半減し、自分は殴らない", () => {
    const battleId = battleIdWithSwingsAt(
      AUTO_ATTACK_PERIOD_TICKS,
      true,
      true,
    );
    const guarding = tickTimes(
      applySetStance(applyBattleStart({ ...startInput, battleId }), "guard"),
      AUTO_ATTACK_PERIOD_TICKS,
    );

    const incomingGuard = computeAttackDamage({
      attackerAttribute: "meat",
      defenderAttribute: "spicy",
      attackerStance: "fight",
      defenderStance: "guard",
      baseDamage: AUTO_ATTACK_DAMAGE,
    });

    expect(INITIAL_MEMBER_HP - (guarding.party?.[0].hp ?? 0)).toBe(incomingGuard);
    expect(guarding.enemy?.hp).toBe(INITIAL_ENEMY_HP);
    expect(guarding.playerGuardRemainingTicks).toBe(
      msToTicks(GUARD_DURATION_MS) - AUTO_ATTACK_PERIOD_TICKS,
    );
  });

  it("クール中はまもれに入れない", () => {
    let state = applySetStance(applyBattleStart(startInput), "guard");
    state = tickTimes(state, msToTicks(GUARD_DURATION_MS));
    expect(state.playerStance).toBe("fight");
    expect(state.playerGuardCooldownTicks).toBe(guardCooldownTicks(BASE_SPEED));

    const rejected = applySetStance(state, "guard");
    expect(rejected.playerStance).toBe("fight");
    expect(rejected.playerGuardRemainingTicks).toBe(0);
  });

  it("中断時のクールはガードしていた場の一体の Speed で決まる", () => {
    const started = applyBattleStart({
      ...startInput,
      party: [
        { ...startInput.party[0], speed: 40 },
        { ...startInput.party[1], speed: 10 },
        startInput.party[2],
      ],
    });
    const guarding = applySetStance(started, "guard");

    const fought = applySetStance(guarding, "fight");
    expect(fought.playerGuardCooldownTicks).toBe(guardCooldownTicks(40));

    const switched = applySwitchMember(guarding, 1);
    expect(switched.activeIndex).toBe(1);
    expect(switched.playerGuardCooldownTicks).toBe(guardCooldownTicks(40));
  });
});

describe("必殺", () => {
  it("ゲージ不足では準備に入れない", () => {
    const started = applyBattleStart(startInput);
    const rejected = applyBeginSpecial(started);

    expect(rejected.playerStance).toBe("fight");
    expect(rejected.playerSpecialChargeTicks).toBe(0);
  });

  it("準備中に発射すると定数倍率のダメージになり、未発射なら自動攻撃へ戻る", () => {
    const charged = applyBeginSpecial({
      ...applyBattleStart(startInput),
      playerGauge: SPECIAL_GAUGE_MAX,
    });
    expect(charged.playerStance).toBe("special");
    expect(charged.playerSpecialChargeTicks).toBe(specialChargeTicks(1));

    const fired = applyFireSpecial(charged);
    const expected = computeAttackDamage({
      attackerAttribute: "spicy",
      defenderAttribute: "meat",
      attackerStance: "fight",
      defenderStance: "fight",
      isSpecial: true,
    });
    expect(fired.enemy?.hp).toBe(INITIAL_ENEMY_HP - expected);
    expect(fired.playerGauge).toBe(0);
    expect(fired.playerStance).toBe("fight");

    const expired = tickTimes(charged, specialChargeTicks(1));
    expect(expired.playerStance).toBe("fight");
    expect(expired.enemy?.hp).toBe(INITIAL_ENEMY_HP);
    expect(expired.playerSpecialChargeTicks).toBe(0);
  });

  it("準備していない発射は無視する", () => {
    const started = applyBattleStart(startInput);
    const rejected = applyFireSpecial(started);
    expect(rejected.enemy?.hp).toBe(INITIAL_ENEMY_HP);
  });

  it("倍速では準備ティックを伸ばして実時間を保つ", () => {
    const charged = applyBeginSpecial(
      { ...applyBattleStart(startInput), playerGauge: SPECIAL_GAUGE_MAX },
      2,
    );
    expect(charged.playerSpecialChargeTicks).toBe(specialChargeTicks(2));
    expect(specialChargeTicks(2)).toBeGreaterThan(specialChargeTicks(1));
  });
});

describe("交代", () => {
  it("交代でゲージを空にし、硬直中は攻撃しない", () => {
    const started = applyBattleStart(startInput);
    const withGauge = { ...started, playerGauge: 40 };
    const switched = applySwitchMember(withGauge, 1);

    expect(switched.activeIndex).toBe(1);
    expect(switched.playerGauge).toBe(0);
    expect(switched.switchStunTicks).toBe(msToTicks(SWITCH_STUN_MS));

    const afterStun = tickTimes(switched, msToTicks(SWITCH_STUN_MS));
    expect(afterStun.enemy?.hp).toBe(INITIAL_ENEMY_HP);
    expect(afterStun.switchStunTicks).toBe(0);
    expect(afterStun.party?.[0].hp).toBe(INITIAL_MEMBER_HP);
  });

  it("硬直中の交代は無視する", () => {
    const switched = applySwitchMember(applyBattleStart(startInput), 1);
    const rejected = applySwitchMember(switched, 2);
    expect(rejected.activeIndex).toBe(1);
  });
});

describe("終了と下書き", () => {
  it("markDefeated は進行中だけ敗北にする", () => {
    expect(applyMarkDefeated(IDLE_BATTLE_SNAPSHOT).status).toBe("idle");
    expect(applyMarkDefeated(applyBattleStart(startInput)).status).toBe(
      "defeated",
    );
  });

  it("markCompleting は戦闘中だけ敵HPを0にして勝利にする", () => {
    expect(applyMarkCompleting(IDLE_BATTLE_SNAPSHOT).status).toBe("idle");

    const won = applyMarkCompleting(applyBattleStart(startInput));
    expect(won.status).toBe("completing");
    expect(won.enemy?.hp).toBe(0);
    expect(won.playerStance).toBe("fight");
  });

  it("排便下書きだけを保持する", () => {
    const withDraft = applySetBowelDraft(applyBattleStart(startInput), {
      hardness: 3,
      color: "brown",
    });
    expect(withDraft.bowelDraft).toEqual({ hardness: 3, color: "brown" });
  });
});
