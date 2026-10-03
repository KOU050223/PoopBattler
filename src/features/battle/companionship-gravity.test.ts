import { describe, expect, it } from "vitest";

import {
  gravityUpVec,
  screenUpAngleDeg,
  smoothAngleDeg,
  smoothGravityVec3,
} from "./companionship-gravity";

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

describe("gravityUpVec", () => {
  it("重力の逆ベクトルを正規化して返す。画面手前が z+ なので寝かせると上はカメラ側", () => {
    const upright = gravityUpVec({ x: 0, y: -9.8, z: 0 });
    expect(upright?.x).toBeCloseTo(0);
    expect(upright?.y).toBeCloseTo(1);
    expect(upright?.z).toBeCloseTo(0);
    const flat = gravityUpVec({ x: 0, y: 0, z: -9.8 });
    expect(flat?.z).toBeCloseTo(1);
    const rolled = gravityUpVec({ x: -9.8, y: 0, z: 0 });
    expect(rolled?.x).toBeCloseTo(1);
    const pitched = gravityUpVec({ x: 0, y: -6.93, z: -6.93 });
    expect(pitched?.y).toBeCloseTo(Math.SQRT1_2);
    expect(pitched?.z).toBeCloseTo(Math.SQRT1_2);
  });

  it("欠損・ノルム不足は null", () => {
    expect(gravityUpVec(null)).toBeNull();
    expect(gravityUpVec({ x: 0, y: -9.8, z: null })).toBeNull();
    expect(gravityUpVec({ x: 0.4, y: 0.2, z: 0 })).toBeNull();
  });
});

describe("smoothGravityVec3", () => {
  it("成分ごとに寄せ、欠損は前回値、初回はそのまま採用", () => {
    const first = smoothGravityVec3(null, { x: 0, y: -9.8, z: 0 });
    expect(first).toEqual({ x: 0, y: -9.8, z: 0 });
    const next = smoothGravityVec3(first, { x: 1, y: -9.8, z: 0.4 }, 0.5);
    expect(next).toEqual({ x: 0.5, y: -9.8, z: 0.2 });
    expect(smoothGravityVec3(next, { x: null, y: -9.8, z: 0 })).toEqual(next);
  });
});
