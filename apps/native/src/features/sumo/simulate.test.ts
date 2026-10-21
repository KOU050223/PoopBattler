import { describe, expect, it } from "vitest";
import { DIFF_MAKUSHITA } from "./config";
import { simulateMatches } from "./simulate";

const MATCH_COUNT = 2000;
const SEED = 12345;

describe("NPC同士(幕下・本気)のシミュレーション", () => {
  const result = simulateMatches({ count: MATCH_COUNT, seed: SEED, diff: DIFF_MAKUSHITA });

  it("全ての取組が決着する(無限ループがない)", () => {
    expect(result.unfinished).toBe(0);
  });

  it("平均の取組時間が30〜80秒に収まる", () => {
    expect(result.averageSeconds).toBeGreaterThanOrEqual(30);
    expect(result.averageSeconds).toBeLessThanOrEqual(80);
  });

  it("同じシードなら結果が完全に一致する", () => {
    const first = simulateMatches({ count: 100, seed: SEED, diff: DIFF_MAKUSHITA });
    const second = simulateMatches({ count: 100, seed: SEED, diff: DIFF_MAKUSHITA });
    expect(second).toEqual(first);
  });
});
