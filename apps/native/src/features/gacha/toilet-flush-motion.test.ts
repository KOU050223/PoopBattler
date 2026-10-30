import { describe, expect, it } from "vitest";

import { SHAKE_AMPLITUDE, SWIRL_TURNS, flushProgress, shakeOffset, swirlAngle, waterLevel } from "./toilet-flush-motion";

describe("flushProgress", () => {
  it("経過時間を 0〜1 に収める", () => {
    expect(flushProgress(-5, 1000)).toBe(0);
    expect(flushProgress(500, 1000)).toBe(0.5);
    expect(flushProgress(5000, 1000)).toBe(1);
  });
});

describe("waterLevel", () => {
  it("最初は満水で、終わると空になる", () => {
    expect(waterLevel(0)).toBe(1);
    expect(waterLevel(1)).toBe(0);
  });

  it("引き始めてからは単調に減る", () => {
    expect(waterLevel(0.6)).toBeGreaterThan(waterLevel(0.8));
  });
});

describe("swirlAngle", () => {
  it("終わりまでに指定回数だけ回る", () => {
    expect(Math.abs(swirlAngle(1))).toBeCloseTo(SWIRL_TURNS * Math.PI * 2);
  });
});

describe("shakeOffset", () => {
  it("始まりと終わりでは揺れていない", () => {
    expect(shakeOffset(0)).toBeCloseTo(0);
    expect(shakeOffset(1)).toBeCloseTo(0);
  });

  it("途中でも振れ幅を超えない", () => {
    for (let p = 0; p <= 1; p += 0.01) expect(Math.abs(shakeOffset(p))).toBeLessThanOrEqual(SHAKE_AMPLITUDE);
  });
});
