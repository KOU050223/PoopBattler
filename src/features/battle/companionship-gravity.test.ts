import { describe, expect, it } from "vitest";

import { screenUpAngleDeg, smoothAngleDeg } from "./companionship-gravity";

describe("screenUpAngleDeg", () => {
  it("直立は 0、横倒しは傾き、平面や欠損は画面上が上", () => {
    expect(screenUpAngleDeg({ x: 0, y: -9.8, z: 0 })).toBeCloseTo(0);
    expect(screenUpAngleDeg({ x: -9.8, y: 0, z: 0 })).toBeCloseTo(90);
    expect(screenUpAngleDeg({ x: 9.8, y: 0, z: 0 })).toBeCloseTo(-90);
    expect(screenUpAngleDeg({ x: 0, y: 0, z: -9.8 })).toBe(0);
    expect(screenUpAngleDeg({ x: 0.4, y: 0.2, z: -9.8 })).toBe(0);
    expect(screenUpAngleDeg(null)).toBe(0);
    expect(screenUpAngleDeg({ x: null, y: -9.8, z: 0 })).toBe(0);
  });
});

describe("smoothAngleDeg", () => {
  it("短い差分は寄せ、±180 付近は短い方へ回す", () => {
    expect(smoothAngleDeg(0, 10, 0.5)).toBeCloseTo(5);
    expect(smoothAngleDeg(170, -170, 0.5)).toBeCloseTo(180);
  });
});
