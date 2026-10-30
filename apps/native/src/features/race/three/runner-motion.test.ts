import { describe, expect, it } from "vitest";
import { PHYSICS } from "../config";
import { createRace } from "../engine";
import { finishPlace, pickRunnerMotion, runnerCadence, RUNNER_MOTION } from "./runner-motion";

const race = createRace({ seed: 3, racers: { player: { stamina: 5, power: 5, technique: 5 } }, collisions: false });
const runnerAt = (speedRatio: number, overrides = {}) => ({ ...race.runners[1], vx: 0, vz: PHYSICS.topSpeed * speedRatio, ...overrides });

describe("pickRunnerMotion", () => {
  it("スタート前（止まっている）は待機", () => {
    expect(pickRunnerMotion(race, runnerAt(0), "idle", false)).toBe("idle");
  });

  it("走り出したら走る", () => {
    expect(pickRunnerMotion(race, runnerAt(0.5), "idle", false)).toBe("run");
  });

  it("走り始めの閾値と止まる閾値の間では今のクリップを保つ", () => {
    const between = (RUNNER_MOTION.startSpeedRatio + RUNNER_MOTION.stopSpeedRatio) / 2;

    expect(pickRunnerMotion(race, runnerAt(between), "run", false)).toBe("run");
    expect(pickRunnerMotion(race, runnerAt(between), "idle", false)).toBe("idle");
  });

  it("転倒中は hit", () => {
    expect(pickRunnerMotion(race, runnerAt(0.5, { stumbleUntil: race.time + 1 }), "run", false)).toBe("hit");
  });

  it("reduce motion では転倒中でも走りのまま", () => {
    expect(pickRunnerMotion(race, runnerAt(0.5, { stumbleUntil: race.time + 1 }), "run", true)).toBe("run");
  });

  it("1着は win、それ以外は lose", () => {
    const finished = { ...race, runners: race.runners.map((r, i) => ({ ...r, finishedAt: i < 2 ? 10 + i : null })) };

    expect(pickRunnerMotion(finished, finished.runners[0], "run", false)).toBe("win");
    expect(pickRunnerMotion(finished, finished.runners[1], "run", false)).toBe("lose");
  });
});

describe("finishPlace", () => {
  it("まだゴールしていなければ null", () => {
    expect(finishPlace(race, race.runners[0])).toBeNull();
  });
});

describe("runnerCadence", () => {
  it("速いほど足の回転が速い", () => {
    expect(runnerCadence(race, runnerAt(1))).toBeGreaterThan(runnerCadence(race, runnerAt(0.2)));
  });

  it("止まりかけでも下限で止まらない", () => {
    expect(runnerCadence(race, runnerAt(0))).toBe(RUNNER_MOTION.cadenceMin);
  });

  it("ジャンプ中はゆっくり", () => {
    expect(runnerCadence(race, runnerAt(1, { jumpUntil: race.time + 0.5 }))).toBe(RUNNER_MOTION.jumpCadence);
  });
});
