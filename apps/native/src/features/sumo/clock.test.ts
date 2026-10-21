import { describe, expect, it } from "vitest";
import { MODE_EARLY } from "./config";
import { MAX_STEPS_PER_FRAME, STEP_MS, createStepper } from "./clock";
import { manualGame } from "./test-helpers";

describe("固定ステップのアキュムレータ", () => {
  it("60Hzちょうどのフレームなら1フレーム1ステップ進む", () => {
    const { game } = manualGame();
    expect(createStepper(game).advance(STEP_MS)).toBe(1);
  });

  it("フレーム時間が不揃いでも合計の時間ぶんだけステップが進む", () => {
    const { game } = manualGame();
    const stepper = createStepper(game);
    let steps = 0;
    for (const frameMs of [5, 30, 12, 8, 25, 20]) steps += stepper.advance(frameMs);
    expect(steps).toBe(6); // 100ms / 16.67ms
  });

  it("1フレームで追従するステップ数に上限がある", () => {
    const { game } = manualGame();
    expect(createStepper(game).advance(5000)).toBe(MAX_STEPS_PER_FRAME);
  });

  it("上限で切り捨てた遅れは次のフレームに持ち越さない", () => {
    const { game } = manualGame();
    const stepper = createStepper(game);
    stepper.advance(5000);
    expect(stepper.advance(0)).toBe(0);
  });

  it("序盤モードは経過時間に0.72が掛かる", () => {
    const { game } = manualGame({ mode: MODE_EARLY });
    const stepper = createStepper(game);
    let steps = 0;
    for (let i = 0; i < 100; i++) steps += stepper.advance(STEP_MS);
    expect(steps).toBe(72);
  });
});
