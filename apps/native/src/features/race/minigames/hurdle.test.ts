import { describe, expect, it } from "vitest";
import { HURDLE } from "../config";
import { beginHurdle, isHurdleSlowMoment, judgeHurdleTap, tapHurdle, updateHurdle } from "./hurdle";
import { createOutput } from "./shared";
import { makeRace, placeBeforeFirstHurdle } from "./test-helpers";

describe("ハードルの判定の境界", () => {
  it("1.3m はパーフェクト", () => {
    expect(judgeHurdleTap(1.3).judge).toBe("perfect");
  });

  it("2.2m はパーフェクト", () => {
    expect(judgeHurdleTap(2.2).judge).toBe("perfect");
  });

  it("1.3m より近く 0.6m 以上はグッド", () => {
    expect(judgeHurdleTap(0.6).judge).toBe("good");
  });

  it("2.2m より遠く 3.4m 以内はグッド", () => {
    expect(judgeHurdleTap(3.4).judge).toBe("good");
  });

  it("3.4m より遠いと早すぎ", () => {
    expect(judgeHurdleTap(3.41).judge).toBe("tooEarly");
  });

  it("0.6m より近いと早すぎ扱い（試作と同じ）", () => {
    expect(judgeHurdleTap(0.59).judge).toBe("tooEarly");
  });

  it("パーフェクトの出来は1、グッドは0.65、早すぎは0.1", () => {
    expect([1.8, 3, 5].map((distance) => judgeHurdleTap(distance).perf)).toEqual([1, 0.65, 0.1]);
  });
});

describe("ハードルのタップ", () => {
  it("パーフェクトのタップはジャンプと0.6秒の加速を指示する", () => {
    const race = makeRace();
    const state = beginHurdle(0.5);
    const out = createOutput();
    placeBeforeFirstHurdle(race, 1.8);

    tapHurdle(state, race, out);

    expect(out.commands).toEqual([
      { type: "jump", runner: 0 },
      { type: "boost", runner: 0, durationSec: HURDLE.perfect.boostSec },
      { type: "setPerf", runner: 0, perf: 1 },
    ]);
  });

  it("8m より遠いタップは無視して何も指示しない", () => {
    const race = makeRace();
    const out = createOutput();
    placeBeforeFirstHurdle(race, 8.5);

    tapHurdle(beginHurdle(0.5), race, out);

    expect(out.commands).toEqual([]);
  });

  it("跳んでいる最中のタップは無視する", () => {
    const race = makeRace();
    const out = createOutput();
    placeBeforeFirstHurdle(race, 1.8);
    race.runners[0].jumpUntil = race.time + 0.3;

    tapHurdle(beginHurdle(0.5), race, out);

    expect(out.commands).toEqual([]);
  });

  it("早すぎるタップは、ハードルの位置に着いたところで転ぶ", () => {
    const race = makeRace();
    const state = beginHurdle(0.5);
    const out = createOutput();
    placeBeforeFirstHurdle(race, 5);
    tapHurdle(state, race, out);
    out.commands.length = 0;

    placeBeforeFirstHurdle(race, 0.2);
    updateHurdle(state, race, out);

    expect(out.commands).toEqual([{ type: "stumble", runner: 0 }]);
  });

  it("早すぎるタップはハードルの手前では転ばない", () => {
    const race = makeRace();
    const state = beginHurdle(0.5);
    const out = createOutput();
    placeBeforeFirstHurdle(race, 5);
    tapHurdle(state, race, out);
    out.commands.length = 0;

    placeBeforeFirstHurdle(race, 1);
    updateHurdle(state, race, out);

    expect(out.commands).toEqual([]);
  });

  it("跳ばずに通り過ぎると転んで、出来0.1のミスになる", () => {
    const race = makeRace();
    const state = beginHurdle(0.5);
    const out = createOutput();
    placeBeforeFirstHurdle(race, -0.3);

    updateHurdle(state, race, out);

    expect(out.events).toEqual([{ type: "hurdleResult", judge: "miss", perf: 0.1 }]);
  });

  it("跳ばずに通り過ぎたときに転倒を指示する", () => {
    const race = makeRace();
    const out = createOutput();
    placeBeforeFirstHurdle(race, -0.3);

    updateHurdle(beginHurdle(0.5), race, out);

    expect(out.commands[0]).toEqual({ type: "stumble", runner: 0 });
  });

  it("出来は結果の平均になる", () => {
    const race = makeRace();
    const state = beginHurdle(0.5);
    placeBeforeFirstHurdle(race, 1.8);
    tapHurdle(state, race, createOutput()); // 1.0
    race.runners[0].jumpUntil = 0;
    race.runners[0].s = race.course.hurdles[1].s - 3; // グッド 0.65

    tapHurdle(state, race, createOutput());

    expect(state.perf).toBeCloseTo((1 + 0.65) / 2);
  });
});

describe("ハードル前のスロー", () => {
  it("7m 手前を切るとスローを求める", () => {
    const race = makeRace();
    placeBeforeFirstHurdle(race, 6.9);

    expect(isHurdleSlowMoment(beginHurdle(0.5), race)).toBe(true);
  });

  it("7m より手前ではスローを求めない", () => {
    const race = makeRace();
    placeBeforeFirstHurdle(race, 7.1);

    expect(isHurdleSlowMoment(beginHurdle(0.5), race)).toBe(false);
  });
});
