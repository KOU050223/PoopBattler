import { describe, expect, it } from "vitest";

import {
  AUTO_ATTACK_DAMAGE,
  AUTO_ATTACK_PERIOD_TICKS,
  BASE_SPEED,
  MAX_AUTO_ATTACK_PERIOD_TICKS,
  MIN_AUTO_ATTACK_PERIOD_TICKS,
  RENTAL_HP,
  RENTAL_POWER,
  RENTAL_SPEED,
  SPECIAL_BASE_DAMAGE,
  SPECIAL_DAMAGE_MULTIPLIER,
  autoAttackPeriodTicks,
  computeAttackDamage,
} from "./battle.constants";
import { applyBattleStart, dealDamage } from "./battle-runtime";
import { fillParty, toStartMember } from "./rental-party";
import type { BattleStartInput, BattleStartMember } from "./battle.types";

function member(overrides: Partial<BattleStartMember> = {}): BattleStartMember {
  return {
    userCharacterId: null,
    characterId: "normal-poop",
    attribute: "normal",
    hp: RENTAL_HP,
    power: RENTAL_POWER,
    speed: RENTAL_SPEED,
    ...overrides,
  };
}

function startInput(
  party: readonly [BattleStartMember, BattleStartMember, BattleStartMember],
): BattleStartInput {
  return {
    battleId: "battle-1",
    enemy: {
      characterId: "normal-enemy",
      attribute: "normal",
      hp: 480,
      power: AUTO_ATTACK_DAMAGE,
      speed: BASE_SPEED,
    },
    party,
    now: 0,
  };
}

describe("autoAttackPeriodTicks", () => {
  it("基準の Speed では既定の待ちティックと一致する", () => {
    expect(autoAttackPeriodTicks(BASE_SPEED)).toBe(AUTO_ATTACK_PERIOD_TICKS);
  });

  it("Speed が高いほど待ちが短く、低いほど長い", () => {
    const slow = autoAttackPeriodTicks(10);
    const base = autoAttackPeriodTicks(BASE_SPEED);
    const fast = autoAttackPeriodTicks(40);

    expect(slow).toBeGreaterThan(base);
    expect(fast).toBeLessThan(base);
  });

  it("両端を超える Speed でも上限・下限に丸める", () => {
    // 落ちるべき側（1ティック連打・事実上の無攻撃）を作らせない。
    expect(autoAttackPeriodTicks(10_000)).toBe(MIN_AUTO_ATTACK_PERIOD_TICKS);
    expect(autoAttackPeriodTicks(1)).toBe(MAX_AUTO_ATTACK_PERIOD_TICKS);
    expect(autoAttackPeriodTicks(0)).toBe(MAX_AUTO_ATTACK_PERIOD_TICKS);
    expect(autoAttackPeriodTicks(-5)).toBe(MAX_AUTO_ATTACK_PERIOD_TICKS);
    expect(autoAttackPeriodTicks(Number.NaN)).toBe(MAX_AUTO_ATTACK_PERIOD_TICKS);
  });
});

describe("個体ごとのステータスがバトルに乗る", () => {
  it("開幕のHPは個体の HP で、定数ではない", () => {
    const state = applyBattleStart(
      startInput([
        member({ characterId: "a", hp: 300 }),
        member({ characterId: "b", hp: 150 }),
        member({ characterId: "c", hp: RENTAL_HP }),
      ]),
    );

    expect(state.party?.[0].hp).toBe(300);
    expect(state.party?.[0].maxHp).toBe(300);
    expect(state.party?.[1].hp).toBe(150);
    // 同じ枠構成でも、個体ごとに違う値がそのまま入る。
    expect(state.party?.[0].hp).not.toBe(state.party?.[1].hp);
  });

  it("通常攻撃のダメージは Power で変わる", () => {
    const weak = applyBattleStart(
      startInput([
        member({ power: 10 }),
        member(),
        member(),
      ]),
    );
    const strong = applyBattleStart(
      startInput([
        member({ power: 40 }),
        member(),
        member(),
      ]),
    );

    const weakDamage = 480 - (dealDamage(weak, "player", false).enemy?.hp ?? 0);
    const strongDamage = 480 - (dealDamage(strong, "player", false).enemy?.hp ?? 0);

    expect(weakDamage).toBe(10);
    expect(strongDamage).toBe(40);
  });

  it("必殺は Power に乗らず、従来の基礎ダメージのままにする", () => {
    // Power を必殺にも掛けると倍率10がそのまま乗って伸びが跳ねるため、
    // 意図的に据え置く（docs/battle.md）。
    const strong = applyBattleStart(
      startInput([member({ power: 40 }), member(), member()]),
    );

    const damage = 480 - (dealDamage(strong, "player", true).enemy?.hp ?? 0);

    expect(damage).toBe(
      computeAttackDamage({
        attackerAttribute: "normal",
        defenderAttribute: "normal",
        attackerStance: "fight",
        defenderStance: "fight",
        isSpecial: true,
      }),
    );
    expect(damage).toBe(SPECIAL_BASE_DAMAGE * SPECIAL_DAMAGE_MULTIPLIER);
  });

  it("敵の通常攻撃も敵の Power で決まる", () => {
    const state = applyBattleStart({
      ...startInput([member(), member(), member()]),
      enemy: {
        characterId: "normal-enemy",
        attribute: "normal",
        hp: 480,
        power: 35,
        speed: BASE_SPEED,
      },
    });

    const after = dealDamage(state, "enemy", false);

    expect(RENTAL_HP - (after.party?.[0].hp ?? 0)).toBe(35);
  });
});

describe("レンタルと所持個体の区別", () => {
  it("レンタルは userCharacterId が null で、3値は定数のまま", () => {
    const rental = toStartMember({
      id: "normal-poop",
      name: "ふつうのうんちくん",
      attribute: "normal",
    });

    // null であることが「育たない」の判定そのもの。
    expect(rental.userCharacterId).toBeNull();
    expect(rental.hp).toBe(RENTAL_HP);
    expect(rental.power).toBe(RENTAL_POWER);
    expect(rental.speed).toBe(RENTAL_SPEED);
  });

  it("所持個体を先に詰め、足りない枠だけレンタルで埋める", () => {
    const owned = member({
      userCharacterId: "uc-1",
      characterId: "curry-poop",
      hp: 260,
      power: 24,
      speed: 22,
    });
    const rental = member();

    const party = fillParty([owned], [rental]);

    expect(party).not.toBeNull();
    expect(party?.[0].userCharacterId).toBe("uc-1");
    expect(party?.[0].power).toBe(24);
    // 残り2枠はレンタル。所有行を増やさず戦える。
    expect(party?.[1].userCharacterId).toBeNull();
    expect(party?.[2].userCharacterId).toBeNull();
  });

  it("所持個体が3体そろえばレンタルを使わない", () => {
    const owned = [
      member({ userCharacterId: "uc-1" }),
      member({ userCharacterId: "uc-2" }),
      member({ userCharacterId: "uc-3" }),
    ];

    const party = fillParty(owned, []);

    expect(party?.map((slot) => slot.userCharacterId)).toEqual([
      "uc-1",
      "uc-2",
      "uc-3",
    ]);
  });

  it("所持個体もレンタル候補も無ければ選出できない", () => {
    expect(fillParty([], [])).toBeNull();
  });
});
