import { describe, expect, it } from "vitest";

import {
  AUTO_ATTACK_DAMAGE,
  GUARD_INCOMING_MULTIPLIER,
  INITIAL_ENEMY_HP,
  SPECIAL_DAMAGE_MULTIPLIER,
  TICK_INTERVAL_MS,
  TYPE_ADVANTAGE,
  TYPE_DISADVANTAGE,
  TYPE_NEUTRAL,
  TYPE_WHEEL,
  computeAttackDamage,
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

describe("computeAttackDamage", () => {
  it("たたかえ同士の等倍は基礎ダメージになる", () => {
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
    ).toBe(AUTO_ATTACK_DAMAGE * SPECIAL_DAMAGE_MULTIPLIER);

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
        AUTO_ATTACK_DAMAGE * TYPE_ADVANTAGE * SPECIAL_DAMAGE_MULTIPLIER,
      ),
    );
  });

  it("有利タイプは約40秒で敵HPを削り切る数値になっている", () => {
    const damagePerTick = computeAttackDamage({
      attackerAttribute: "spicy",
      defenderAttribute: "meat",
      attackerStance: "fight",
      defenderStance: "fight",
    });
    const ticksToKo = INITIAL_ENEMY_HP / damagePerTick;

    expect(ticksToKo * TICK_INTERVAL_MS).toBe(40_000);
  });
});
