import { describe, expect, it } from "vitest";

import { STRAIN_REQUIRED_MS } from "@/lib/motion";
import {
  AUTO_ATTACK_DAMAGE,
  AUTO_ATTACK_PERIOD_TICKS,
  BATTLE_SPEEDS,
  GUARD_INCOMING_MULTIPLIER,
  SPECIAL_BASE_DAMAGE,
  SPECIAL_DAMAGE_MULTIPLIER,
  TYPE_ADVANTAGE,
  TYPE_DISADVANTAGE,
  TYPE_NEUTRAL,
  TYPE_WHEEL,
  computeAttackDamage,
  matchupTone,
  shouldAutoAttack,
  specialChargeTicks,
  tickIntervalMs,
  typeMultiplier,
} from "./battle.constants";

describe("typeMultiplier", () => {
  it("docsの有利・不利表と一致する", () => {
    const table = {
      spicy: { advantage: ["meat", "vegetable"], disadvantage: ["sweet", "curry"] },
      meat: { advantage: ["vegetable", "dairy"], disadvantage: ["curry", "spicy"] },
      vegetable: { advantage: ["dairy", "sweet"], disadvantage: ["spicy", "meat"] },
      dairy: { advantage: ["sweet", "curry"], disadvantage: ["meat", "vegetable"] },
      sweet: { advantage: ["curry", "spicy"], disadvantage: ["vegetable", "dairy"] },
      curry: { advantage: ["spicy", "meat"], disadvantage: ["dairy", "sweet"] },
    } as const;

    for (const attacker of TYPE_WHEEL) {
      const expected = table[attacker];
      for (const defender of expected.advantage) {
        expect(typeMultiplier(attacker, defender)).toBe(TYPE_ADVANTAGE);
      }
      for (const defender of expected.disadvantage) {
        expect(typeMultiplier(attacker, defender)).toBe(TYPE_DISADVANTAGE);
      }
    }
  });

  it("同属性と反対属性は等倍である", () => {
    for (const [index, attacker] of TYPE_WHEEL.entries()) {
      const opposite = TYPE_WHEEL[(index + 3) % TYPE_WHEEL.length];
      expect(typeMultiplier(attacker, attacker)).toBe(TYPE_NEUTRAL);
      expect(typeMultiplier(attacker, opposite)).toBe(TYPE_NEUTRAL);
    }
  });

  it("normal は与えるのも受けるのも等倍である", () => {
    for (const attribute of [...TYPE_WHEEL, "normal"] as const) {
      expect(typeMultiplier("normal", attribute)).toBe(TYPE_NEUTRAL);
      expect(typeMultiplier(attribute, "normal")).toBe(TYPE_NEUTRAL);
    }
  });
});

describe("matchupTone", () => {
  it("有利・等倍・不利を3値だけ返す", () => {
    expect(matchupTone("spicy", "meat")).toBe("advantage");
    expect(matchupTone("spicy", "spicy")).toBe("neutral");
    expect(matchupTone("spicy", "sweet")).toBe("disadvantage");
    expect(matchupTone("normal", "meat")).toBe("neutral");
  });
});

describe("computeAttackDamage", () => {
  it("自動攻撃同士の等倍は基礎ダメージになる", () => {
    expect(
      computeAttackDamage({
        attackerAttribute: "curry",
        defenderAttribute: "curry",
        attackerStance: "fight",
        defenderStance: "fight",
      }),
    ).toBe(AUTO_ATTACK_DAMAGE);
  });

  it("まもれ中は被ダメが半減し、自分は殴らない", () => {
    expect(
      computeAttackDamage({
        attackerAttribute: "curry",
        defenderAttribute: "curry",
        attackerStance: "fight",
        defenderStance: "guard",
      }),
    ).toBe(AUTO_ATTACK_DAMAGE * GUARD_INCOMING_MULTIPLIER);

    expect(
      computeAttackDamage({
        attackerAttribute: "curry",
        defenderAttribute: "curry",
        attackerStance: "guard",
        defenderStance: "fight",
      }),
    ).toBe(0);
  });

  it("必殺は定数倍率で、有利タイプならその補正も乗る", () => {
    expect(
      computeAttackDamage({
        attackerAttribute: "curry",
        defenderAttribute: "curry",
        attackerStance: "fight",
        defenderStance: "fight",
        isSpecial: true,
      }),
    ).toBe(SPECIAL_BASE_DAMAGE * SPECIAL_DAMAGE_MULTIPLIER);

    expect(
      computeAttackDamage({
        attackerAttribute: "spicy",
        defenderAttribute: "meat",
        attackerStance: "fight",
        defenderStance: "fight",
        isSpecial: true,
      }),
    ).toBe(
      Math.floor(
        SPECIAL_BASE_DAMAGE * TYPE_ADVANTAGE * SPECIAL_DAMAGE_MULTIPLIER,
      ),
    );
  });
});

describe("shouldAutoAttack", () => {
  it("5 tick 以外では振らない", () => {
    for (const tick of [0, 1, 2, 3, 4, 6, 7, 8, 9, 11]) {
      expect(shouldAutoAttack("battle-1", tick, "player")).toBe(false);
      expect(shouldAutoAttack("battle-1", tick, "enemy")).toBe(false);
    }
  });

  it("同じバトルと同じ tick なら同じ結果になる", () => {
    const first = shouldAutoAttack(
      "battle-1",
      AUTO_ATTACK_PERIOD_TICKS,
      "player",
    );
    const second = shouldAutoAttack(
      "battle-1",
      AUTO_ATTACK_PERIOD_TICKS,
      "player",
    );

    expect(first).toBe(second);
  });

  it("窓では当たる場合と外れる場合の両方がある", () => {
    const tick = AUTO_ATTACK_PERIOD_TICKS;
    const hits = Array.from({ length: 40 }, (_, index) =>
      shouldAutoAttack(`roll-${index}`, tick, "player"),
    );

    expect(hits).toContain(true);
    expect(hits).toContain(false);
  });

  it("味方と敵の抽選は独立している", () => {
    const tick = AUTO_ATTACK_PERIOD_TICKS;
    const split = Array.from({ length: 80 }, (_, index) => {
      const battleId = `roll-${index}`;
      return {
        player: shouldAutoAttack(battleId, tick, "player"),
        enemy: shouldAutoAttack(battleId, tick, "enemy"),
      };
    });

    expect(split.some((roll) => roll.player && !roll.enemy)).toBe(true);
    expect(split.some((roll) => !roll.player && roll.enemy)).toBe(true);
  });
});

describe("必殺の準備ウィンドウ", () => {
  it("等倍でも倍速でも10秒振り切る前に時間切れしない", () => {
    for (const speed of BATTLE_SPEEDS) {
      expect(specialChargeTicks(speed) * tickIntervalMs(speed)).toBeGreaterThan(
        STRAIN_REQUIRED_MS,
      );
    }
  });
});
