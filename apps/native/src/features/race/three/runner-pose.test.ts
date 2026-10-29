import { describe, expect, it } from "vitest";
import { HURDLE, PHYSICS } from "../config";
import { createRace } from "../engine";
import { createRunnerPose, headingToRotationY, poseRunner } from "./runner-pose";

const race = createRace({ seed: 3, racers: { player: { stamina: 5, power: 5, technique: 5 } }, collisions: false });
const runner = () => ({ ...race.runners[1] });

describe("poseRunner", () => {
  it("ジャンプの中間で最も高く浮く", () => {
    const jumping = { ...runner(), jumpUntil: HURDLE.jumpSec };

    const pose = poseRunner(jumping, HURDLE.jumpSec / 2, true, createRunnerPose());

    expect(pose.lift).toBeCloseTo(HURDLE.jumpHeight);
  });

  it("ジャンプが終わったら浮かない", () => {
    const landed = { ...runner(), jumpUntil: 1 };

    expect(poseRunner(landed, 2, true, createRunnerPose()).lift).toBe(0);
  });

  it("転倒の中間で前に倒れる", () => {
    const stumbling = { ...runner(), stumbleUntil: PHYSICS.stumbleDuration };

    expect(poseRunner(stumbling, PHYSICS.stumbleDuration / 2, true, createRunnerPose()).pitch).toBeGreaterThan(0);
  });

  it("つり橋の針が右に寄ると左へ傾く（符号が針と逆）", () => {
    const onBridge = { ...runner(), bridgeNeedle: 1 };

    expect(poseRunner(onBridge, 0, true, createRunnerPose()).roll).toBeLessThan(0);
  });

  it("針が無いときは傾かない", () => {
    expect(poseRunner({ ...runner(), bridgeNeedle: null }, 0, true, createRunnerPose()).roll).toBe(0);
  });

  it("reduce motion では走る揺れが付かない", () => {
    const running = { ...runner(), vx: 15, vz: 0 };

    expect(poseRunner(running, 0.05, true, createRunnerPose()).y).toBe(running.y);
  });

  it("出力オブジェクトをそのまま返す", () => {
    const out = createRunnerPose();

    expect(poseRunner(runner(), 0, true, out)).toBe(out);
  });
});

describe("headingToRotationY", () => {
  it("+x を向く走者（h=0）は +z 向きのモデルを90度回す", () => {
    expect(headingToRotationY(0)).toBeCloseTo(Math.PI / 2);
  });
});
