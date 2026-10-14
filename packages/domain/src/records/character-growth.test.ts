import { describe, expect, it } from "vitest";

import {
  canEvolve,
  checkMerge,
  effectiveStat,
  effectiveStats,
  growthStep,
  isEnhanced,
  isFullyGrown,
} from "./character-growth";

function character(overrides: Partial<Parameters<typeof checkMerge>[0]> = {}) {
  return {
    ownershipId: "base",
    id: "curry-poop",
    rarity: "common" as const,
    tier: 0,
    rank: 0,
    baseStats: { hp: 240, power: 20, speed: 20 },
    ...overrides,
  };
}

describe("effectiveStat", () => {
  it("★1・0凸は個体値そのまま", () => {
    expect(effectiveStats({ hp: 240, power: 20, speed: 18 }, "common", { tier: 0, rank: 0 }))
      .toEqual({ hp: 240, power: 20, speed: 18 });
  });

  // scripts/sql/rls-verify.sql の「スナップショットに★と凸を掛けた実効値が載る」と同じ値。
  // ここがずれたら、図鑑の表示とバトルの実数が食い違っている。
  it("SQL 側の検査と同じ実効値になる", () => {
    expect(effectiveStats({ hp: 240, power: 20, speed: 20 }, "common", { tier: 1, rank: 1 }))
      .toEqual({ hp: 300, power: 25, speed: 25 });
    expect(effectiveStats({ hp: 240, power: 20, speed: 20 }, "common", { tier: 2, rank: 4 }))
      .toEqual({ hp: 384, power: 32, speed: 32 });
    expect(effectiveStats({ hp: 456, power: 38, speed: 38 }, "legendary", { tier: 0, rank: 4 }))
      .toEqual({ hp: 638, power: 53, speed: 53 });
    expect(effectiveStats({ hp: 384, power: 32, speed: 32 }, "epic", { tier: 0, rank: 2 }))
      .toEqual({ hp: 445, power: 37, speed: 37 });
    expect(effectiveStats({ hp: 312, power: 26, speed: 26 }, "rare", { tier: 0, rank: 1 }))
      .toEqual({ hp: 334, power: 28, speed: 28 });
  });

  it(".5 は SQL の整数演算と同じく切り上げる", () => {
    // 30 × 1.05 = 31.5
    expect(effectiveStat(30, "common", { tier: 0, rank: 1 })).toBe(32);
    // 21 × 1.05 = 22.05
    expect(effectiveStat(21, "common", { tier: 0, rank: 1 })).toBe(22);
  });

  it("進化しても実効値は下がらない（★1・4凸 = ★2・0凸）", () => {
    expect(growthStep({ tier: 0, rank: 4 })).toBe(growthStep({ tier: 1, rank: 0 }));
    expect(effectiveStat(20, "rare", { tier: 0, rank: 4 }))
      .toBe(effectiveStat(20, "rare", { tier: 1, rank: 0 }));
  });

  it("最大まで育てた common は素の legendary に届かない", () => {
    expect(effectiveStat(20, "common", { tier: 2, rank: 4 })).toBeLessThan(38);
  });
});

describe("育成状態の判定", () => {
  it("★2以上または1凸以上が育成済み", () => {
    expect(isEnhanced({ tier: 0, rank: 0 })).toBe(false);
    expect(isEnhanced({ tier: 0, rank: 1 })).toBe(true);
    expect(isEnhanced({ tier: 1, rank: 0 })).toBe(true);
  });

  it("4凸かつ★3未満だけが進化できる", () => {
    expect(canEvolve({ tier: 0, rank: 3 })).toBe(false);
    expect(canEvolve({ tier: 0, rank: 4 })).toBe(true);
    expect(canEvolve({ tier: 1, rank: 4 })).toBe(true);
    expect(canEvolve({ tier: 2, rank: 4 })).toBe(false);
    expect(isFullyGrown({ tier: 2, rank: 4 })).toBe(true);
    expect(isFullyGrown({ tier: 2, rank: 3 })).toBe(false);
  });
});

describe("checkMerge", () => {
  it("同じ種族の未育成素材は警告なしで合成できる", () => {
    expect(checkMerge(character(), character({ ownershipId: "material" })))
      .toEqual({ ok: true, nextRank: 1, warnings: [] });
  });

  it("同じ個体・別の種族は合成できない", () => {
    expect(checkMerge(character(), character()))
      .toEqual({ ok: false, reason: "same-character" });
    expect(checkMerge(character(), character({ ownershipId: "material", id: "meat-poop" })))
      .toEqual({ ok: false, reason: "different-species" });
  });

  it("レアリティごとの凸数だけ上がり、4凸を超えるなら拒否する", () => {
    expect(checkMerge(
      character({ id: "yogurt-poop", rarity: "epic", rank: 2 }),
      character({ ownershipId: "material", id: "yogurt-poop", rarity: "epic" }),
    )).toMatchObject({ ok: true, nextRank: 4 });
    expect(checkMerge(
      character({ id: "yogurt-poop", rarity: "epic", rank: 3 }),
      character({ ownershipId: "material", id: "yogurt-poop", rarity: "epic" }),
    )).toEqual({ ok: false, reason: "rank-overflow" });
    expect(checkMerge(
      character({ id: "golden-poop", rarity: "legendary" }),
      character({ ownershipId: "material", id: "golden-poop", rarity: "legendary" }),
    )).toMatchObject({ ok: true, nextRank: 4 });
    expect(checkMerge(
      character({ id: "spicy-poop", rarity: "rare", rank: 3 }),
      character({ ownershipId: "material", id: "spicy-poop", rarity: "rare" }),
    )).toMatchObject({ ok: true, nextRank: 4 });
    expect(checkMerge(character({ rank: 4 }), character({ ownershipId: "material" })))
      .toEqual({ ok: false, reason: "rank-overflow" });
  });

  it("育成済みの素材には警告を付ける", () => {
    expect(checkMerge(character(), character({ ownershipId: "material", rank: 2 })))
      .toMatchObject({ ok: true, warnings: ["enhanced-material"] });
    expect(checkMerge(character(), character({ ownershipId: "material", tier: 1 })))
      .toMatchObject({ ok: true, warnings: ["enhanced-material"] });
  });

  it("素材の個体値の方が高ければ警告し、同等以下なら警告しない", () => {
    expect(checkMerge(
      character(),
      character({ ownershipId: "material", baseStats: { hp: 240, power: 21, speed: 20 } }),
    )).toMatchObject({ ok: true, warnings: ["material-has-better-base-stats"] });
    expect(checkMerge(
      character(),
      character({ ownershipId: "material", baseStats: { hp: 240, power: 20, speed: 20 } }),
    )).toMatchObject({ ok: true, warnings: [] });
    // HP は12倍の桁なので、HP+11 は Power+1 に届かない。
    expect(checkMerge(
      character(),
      character({ ownershipId: "material", baseStats: { hp: 251, power: 20, speed: 19 } }),
    )).toMatchObject({ ok: true, warnings: [] });
  });
});
