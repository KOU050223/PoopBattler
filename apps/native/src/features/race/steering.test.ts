import { describe, expect, it } from "vitest";
import { lookaheadSteps, scaledLane, steerHeading, wrapAngle, type SteerInput } from "./steering";
import { generateCourseFromSeed } from "./course";
import { advanceVelocity, derivePhysics } from "./physics";

const { points } = generateCourseFromSeed(1);
const SIDE_VELOCITY = 4;

function straightInput(overrides: Partial<SteerInput> = {}): SteerInput {
  return {
    points,
    trackIndex: 40,
    x: points[40].x,
    z: points[40].z,
    heading: 0,
    speed: 10,
    laneBase: 0,
    passLat: null,
    bridgeNeedle: null,
    turn: 2.6,
    dt: 1 / 120,
    ...overrides,
  };
}

describe("操舵", () => {
  it("先読みは速さ0でも5点", () => {
    expect(lookaheadSteps(0)).toBe(5);
  });

  it("先読みは速さ30（5+10.5=15.5）でも14点で止まる", () => {
    expect(lookaheadSteps(30)).toBe(14);
  });

  it("先読みは速さ10で 5+3.5 を丸めて9点（試作の Math.round と同じ）", () => {
    expect(lookaheadSteps(10)).toBe(9);
  });

  it("橋の幅6.5ではレーンが幅に比例して縮む", () => {
    expect(scaledLane(4.2, 6.5)).toBeCloseTo((4.2 * 6.5) / 11);
  });

  it("角度は -π〜π に畳まれる", () => {
    expect(wrapAngle(3 * Math.PI)).toBeCloseTo(Math.PI, 5);
  });

  it("目標が真横にあっても1ステップで turn×dt しか曲がらない", () => {
    const heading = steerHeading(straightInput({ heading: Math.PI / 2 }));
    expect(Math.PI / 2 - heading).toBeCloseTo((2.6 * 1) / 120);
  });

  it("追い抜きの横位置を指定すると、そちらの側へ向く", () => {
    const heading = steerHeading(straightInput({ passLat: 3 }));
    expect(heading).toBeGreaterThan(0);
  });

  it("横滑りの速度は毎ステップ exp(−slide×dt) で減る", () => {
    const physics = derivePhysics({ stamina: 5, power: 5, technique: 5 });
    const next = advanceVelocity({ vx: 10, vz: SIDE_VELOCITY }, 0, 10, physics, 1 / 120);
    expect(next.vz).toBeCloseTo(SIDE_VELOCITY * Math.exp(-physics.slide / 120));
  });
});
