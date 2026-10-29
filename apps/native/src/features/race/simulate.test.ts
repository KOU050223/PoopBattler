import { describe, expect, it } from "vitest";
import { STAT_PRESETS, simulateRaces, type StatPresetKey } from "./simulate";
import type { BotSkill } from "./bots";

/** 試作 race-minigame.html を node で回した値（docs/race.md 8章）。許容は ±0.5 */
const TOLERANCE = 0.5;
/** 150 本で平均のぶれが ±0.15 ほどに収まる（DIFFS.md の実測値）。これ以上は数十秒を超える */
const RACE_COUNT = 150;
const SEED = 12345;
/** 150 本は1条件で10秒ほどかかる。vitest の既定(5秒)では足りない */
const TEST_TIMEOUT_MS = 60_000;

function averagePlace(skill: BotSkill, preset: StatPresetKey) {
  return simulateRaces({ count: RACE_COUNT, seed: SEED, stats: STAT_PRESETS[preset], skill });
}

describe("バランス型の腕前ごとの平均着順", () => {
  it.each([
    ["perfect", 1.6],
    ["decent", 3.1],
    ["idle", 7.7],
  ] as const)("%s のボットで %f 着の ±0.5 に収まる", (skill, expected) => {
    const result = averagePlace(skill, "balance");
    expect(result.unfinished).toBe(0);
    expect(Math.abs(result.averagePlace - expected)).toBeLessThanOrEqual(TOLERANCE);
  }, TEST_TIMEOUT_MS);
});

// パワー型・技術型・体力型は試作の値（4.1 / 4.5 / 4.8）に届かない。試作を同条件で回しても届かないため、
// 範囲の主張は置かず DIFFS.md の「実測値」に記録している
describe("そこそこの腕前のタイプ別の平均着順", () => {
  it("二刀流（技術1）が 6.0 着の ±0.5 に収まる", () => {
    expect(Math.abs(averagePlace("decent", "twinBlade").averagePlace - 6.0)).toBeLessThanOrEqual(TOLERANCE);
  }, TEST_TIMEOUT_MS);
});

describe("シミュレーションの再現性", () => {
  it("同じシードなら結果が完全に一致する", () => {
    const first = simulateRaces({ count: 5, seed: SEED, stats: STAT_PRESETS.balance, skill: "decent" });
    const second = simulateRaces({ count: 5, seed: SEED, stats: STAT_PRESETS.balance, skill: "decent" });
    expect(second).toEqual(first);
  });
});
