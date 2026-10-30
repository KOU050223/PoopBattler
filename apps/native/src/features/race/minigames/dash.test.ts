import { describe, expect, it } from "vitest";
import { createRaceClock } from "../clock";
import { beginDash, dashTarget, updateDash } from "./dash";
import { createOutput } from "./shared";

/** 毎秒 ratePerSec 回の連打を、最後のタップが nowMs になるように並べる */
const tapsEnding = (nowMs: number, ratePerSec: number, count = 20) =>
  Array.from({ length: count }, (_, i) => nowMs - (i * 1000) / ratePerSec);

describe("ダッシュの目標", () => {
  it("毎秒9回の連打で目標は1", () => {
    expect(dashTarget(tapsEnding(5000, 9), 5000)).toBe(1);
  });

  it("毎秒1回の連打なら目標は0", () => {
    expect(dashTarget(tapsEnding(5000, 1), 5000)).toBe(0);
  });

  it("連打がなければ目標は0", () => {
    expect(dashTarget([], 5000)).toBe(0);
  });

  it("窓（0.8秒）より前のタップは数えない", () => {
    expect(dashTarget([3000, 3100, 3200, 3300, 3400, 3500, 3600, 4100], 5000)).toBe(0);
  });

  it("スロー（時間倍率0.4）でも同じ実時間なら目標は変わらない", () => {
    const normal = createRaceClock();
    const slow = createRaceClock();
    for (let i = 0; i < 20; i++) {
      normal.advance(0.05, 1);
      slow.advance(0.05, 0.4);
    }
    const taps = tapsEnding(slow.realElapsedSec * 1000, 9);

    expect(dashTarget(taps, slow.realElapsedSec * 1000)).toBe(dashTarget(taps, normal.realElapsedSec * 1000));
  });
});

describe("ダッシュの出来", () => {
  it("区間に入った時点は0.3", () => {
    expect(beginDash().perf).toBe(0.3);
  });

  it("連打しているあいだ perf は目標の1へ寄っていく", () => {
    const state = beginDash();
    state.tapsMs = tapsEnding(5000, 9);

    for (let i = 0; i < 120; i++) updateDash(state, 5000, createOutput());

    expect(state.perf).toBeGreaterThan(0.99);
  });

  it("0.92を超えた瞬間に「全開」を1回だけ出す", () => {
    const state = beginDash();
    state.tapsMs = tapsEnding(5000, 9);
    const out = createOutput();

    for (let i = 0; i < 120; i++) updateDash(state, 5000, out);

    expect(out.events.filter((event) => event.type === "dashAllOut")).toHaveLength(1);
  });

  it("連打をやめると perf は0へ戻っていく", () => {
    const state = beginDash();
    state.perf = 1;

    for (let i = 0; i < 240; i++) updateDash(state, 5000, createOutput());

    expect(state.perf).toBeLessThan(0.01);
  });
});
