import { describe, expect, it } from "vitest";
import { beginSwipe, judgeArrow, swipeSwipe, updateSwipe } from "./swipe";
import { createOutput } from "./shared";
import { makeRace, SEED } from "./test-helpers";
import { createRng } from "../rng";

describe("S字の判定", () => {
  it("0.45秒ちょうどの正解は1.0", () => {
    expect(judgeArrow(true, 0.45).perf).toBe(1);
  });

  it("0.46秒の正解は0.7", () => {
    expect(judgeArrow(true, 0.46).perf).toBe(0.7);
  });

  it("外れは速くても0.1", () => {
    expect(judgeArrow(false, 0.1).perf).toBe(0.1);
  });
});

describe("S字の矢印", () => {
  it("矢印は4つで、同じシードなら同じ向き", () => {
    const race = makeRace();

    expect(beginSwipe(createRng(SEED), race, 0.5).arrows).toEqual(beginSwipe(createRng(SEED), race, 0.5).arrows);
  });

  it("0.8秒ちょうどはまだ時間切れにならない", () => {
    const race = makeRace();
    const state = beginSwipe(createRng(SEED), race, 0.5);
    const out = createOutput();
    race.time = state.arrowStartSec + 0.8;

    updateSwipe(state, race, out);

    expect(out.events).toEqual([]);
  });

  it("0.8秒を超えると時間切れで0.1になる", () => {
    const race = makeRace();
    const state = beginSwipe(createRng(SEED), race, 0.5);
    const out = createOutput();
    race.time = state.arrowStartSec + 0.81;

    updateSwipe(state, race, out);

    expect(out.events).toEqual([{ type: "arrowResult", arrowIndex: 0, judge: "miss", perf: 0.1 }]);
  });

  it("速い正解は0.4秒の加速を指示する", () => {
    const race = makeRace();
    const state = beginSwipe(createRng(SEED), race, 0.5);
    const out = createOutput();
    race.time = state.arrowStartSec + 0.3;

    swipeSwipe(state, state.arrows[0], race, out);

    expect(out.commands).toContainEqual({ type: "boost", runner: 0, durationSec: 0.4 });
  });

  it("外れは0.3秒の減速を指示する", () => {
    const race = makeRace();
    const state = beginSwipe(createRng(SEED), race, 0.5);
    const out = createOutput();
    const wrong = state.arrows[0] === "up" ? "down" : "up";

    swipeSwipe(state, wrong, race, out);

    expect(out.commands).toContainEqual({ type: "slow", runner: 0, durationSec: 0.3 });
  });

  it("外れでも転倒の出来事は出さない（減速だけ）", () => {
    const race = makeRace();
    const state = beginSwipe(createRng(SEED), race, 0.5);
    const out = createOutput();
    const wrong = state.arrows[0] === "up" ? "down" : "up";

    swipeSwipe(state, wrong, race, out);

    expect(out.commands.some((command) => command.type === "stumble")).toBe(false);
  });

  it("正解すると次の矢印に進み、制限時間は新しく数え直す", () => {
    const race = makeRace();
    const state = beginSwipe(createRng(SEED), race, 0.5);
    race.time = 0.6;

    swipeSwipe(state, state.arrows[0], race, createOutput());

    expect(state.arrowStartSec).toBe(0.6);
  });

  it("4つ終えたあとのスワイプは無視する", () => {
    const race = makeRace();
    const state = beginSwipe(createRng(SEED), race, 0.5);
    for (let i = 0; i < 4; i++) swipeSwipe(state, state.arrows[i], race, createOutput());
    const out = createOutput();

    swipeSwipe(state, "up", race, out);

    expect(out.events).toEqual([]);
  });
});
