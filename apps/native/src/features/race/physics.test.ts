import { describe, expect, it } from "vitest";
import { derivePhysics, gradeAt, targetSpeed, uphillFactor, type TargetSpeedInput } from "./physics";
import { generateCourseFromSeed } from "./course";
import type { CoursePoint } from "./types";

const BALANCED = { stamina: 5, power: 5, technique: 5 };

const straightPoint: CoursePoint = { x: 0, z: 0, y: 0, h: 0, k: 0, w: 11, s: 0, kind: "watch", terrain: "uphill" };

/** 調子の波が 1 になる（time 0・位相 0）、他の補正が何もない状態 */
function neutralInput(overrides: Partial<TargetSpeedInput> = {}): TargetSpeedInput {
  return {
    physics: derivePhysics(BALANCED),
    point: straightPoint,
    curvature: 0,
    grade: 0,
    perf: 0.5,
    time: 0,
    formPhase: 0,
    draft: 0,
    isStumbling: false,
    isBoosting: false,
    isFinished: false,
    ...overrides,
  };
}

describe("ステータス → 物理", () => {
  const physics = derivePhysics(BALANCED);

  it("体力5のとき topSta は 16", () => {
    expect(physics.topSta).toBeCloseTo(16);
  });

  it("パワー5のとき topPow は 16", () => {
    expect(physics.topPow).toBeCloseTo(16);
  });

  it("パワー5のとき accel は 8", () => {
    expect(physics.accel).toBeCloseTo(8);
  });

  it("技術5のとき grip は 15.75", () => {
    expect(physics.grip).toBeCloseTo(15.75);
  });

  it("技術5のとき turn は 2.6", () => {
    expect(physics.turn).toBeCloseTo(2.6);
  });

  it("技術5のとき slide は 5.2", () => {
    expect(physics.slide).toBeCloseTo(5.2);
  });

  it("パワー5のとき mass は 1.6", () => {
    expect(physics.mass).toBeCloseTo(1.6);
  });
});

describe("上り坂の係数", () => {
  it("パワー5で勾配0.1なら 1 − 0.1×(1.6−0.65) = 0.905", () => {
    expect(uphillFactor(0.1, 5)).toBeCloseTo(0.905);
  });

  it("急な坂でも 0.35 を下回らない", () => {
    expect(uphillFactor(2, 0)).toBe(0.35);
  });

  it("コースの上り坂では勾配が正になる", () => {
    const { points, sections } = generateCourseFromSeed(1);
    const uphill = sections.find((section) => section.terrain === "uphill");
    expect(gradeAt(points, (uphill?.startS ?? 0) + 5)).toBeGreaterThan(0);
  });
});

describe("目標速度", () => {
  it("カーブでは √(grip/κ) に頭打ちされる", () => {
    const input = neutralInput({ curvature: 0.1 });
    expect(targetSpeed(input)).toBeCloseTo(Math.sqrt(15.75 / 0.1));
  });

  it("曲率が閾値 0.02 以下なら頭打ちにならない", () => {
    expect(targetSpeed(neutralInput({ curvature: 0.02 }))).toBeCloseTo(15);
  });

  it("下りでは (1 − 勾配×0.4) 倍になる", () => {
    expect(targetSpeed(neutralInput({ grade: -0.1 }))).toBeCloseTo(15 * 1.04);
  });

  it("ミニゲーム区間では perf 1 で 1.22 倍になる", () => {
    const point: CoursePoint = { ...straightPoint, kind: "zone", terrain: undefined, zone: "bridge", zoneIndex: 0 };
    expect(targetSpeed(neutralInput({ point, perf: 1 }))).toBeCloseTo(15 * 1.22);
  });

  it("スリップストリーム最大で 1.09 倍になる", () => {
    expect(targetSpeed(neutralInput({ draft: 1 }))).toBeCloseTo(15 * 1.09);
  });

  it("転倒中は 0.45 倍になる", () => {
    expect(targetSpeed(neutralInput({ isStumbling: true }))).toBeCloseTo(15 * 0.45);
  });

  it("加速の演出中は 1.2 倍になる", () => {
    expect(targetSpeed(neutralInput({ isBoosting: true }))).toBeCloseTo(15 * 1.2);
  });

  it("ゴール後は他の補正に関わらず 4 m/s になる", () => {
    expect(targetSpeed(neutralInput({ isFinished: true, draft: 1, isBoosting: true }))).toBe(4);
  });

  it("直線の地形では topSta が最高速になる", () => {
    const point: CoursePoint = { ...straightPoint, terrain: "straight" };
    expect(targetSpeed(neutralInput({ point, physics: derivePhysics({ stamina: 9, power: 0, technique: 5 }) }))).toBeCloseTo(19.2);
  });
});
