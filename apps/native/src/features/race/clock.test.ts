import { describe, expect, it } from "vitest";
import { MAX_STEPS_PER_FRAME, TIME_SCALE_HURDLE, createRaceClock } from "./clock";

describe("固定ステップのアキュムレータ", () => {
  it("delta が 1/60 秒なら2ステップ進む", () => {
    const clock = createRaceClock();
    expect(clock.advance(1 / 60)).toBe(2);
  });

  it("時間倍率 0.4 だと同じ delta でも進むステップが減る", () => {
    const clock = createRaceClock();
    let steps = 0;
    for (let i = 0; i < 60; i++) steps += clock.advance(1 / 60, TIME_SCALE_HURDLE);
    expect(steps).toBe(48); // 120 ステップ × 0.4
  });

  it("上限を超える delta でも上限ステップで止まる", () => {
    const clock = createRaceClock();
    expect(clock.advance(5)).toBe(MAX_STEPS_PER_FRAME);
  });

  it("上限で切り捨てた遅れは次のフレームに持ち越さない", () => {
    const clock = createRaceClock();
    clock.advance(5);
    expect(clock.advance(0)).toBe(0);
  });

  it("スロー中でも実時間の経過は倍率の影響を受けない", () => {
    const clock = createRaceClock();
    clock.advance(0.5, TIME_SCALE_HURDLE);
    expect(clock.realElapsedSec).toBeCloseTo(0.5);
  });
});
