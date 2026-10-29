import { describe, expect, it } from "vitest";
import { enterZone, exitZone, gradeOf } from "./index";
import { createOutput } from "./shared";
import { makeRace } from "./test-helpers";

describe("評価の閾値", () => {
  it.each([
    [0.88, "S"],
    [0.8799, "A"],
    [0.68, "A"],
    [0.6799, "B"],
    [0.45, "B"],
    [0.4499, "C"],
    [0, "C"],
  ])("平均 %f は %s", (average, grade) => {
    expect(gradeOf(average)).toBe(grade);
  });
});

describe("区間の出入り", () => {
  it("ハードルで何も結果がなければ平均0.1でCになる", () => {
    const race = makeRace();
    const out = createOutput();
    const game = enterZone(race, "hurdle", 1, out);

    exitZone(game, 1, out);

    expect(out.events.at(-1)).toEqual({ type: "end", zone: "hurdle", zoneIndex: 1, grade: "C", average: 0.1 });
  });

  it("つり橋を出るとき針をエンジンから外す", () => {
    const race = makeRace();
    const out = createOutput();
    const game = enterZone(race, "bridge", 0, out);

    exitZone(game, 0, out);

    expect(out.commands).toEqual([{ type: "setBridgeNeedle", runner: 0, needle: null }]);
  });

  it("入った区間を知らせる", () => {
    const out = createOutput();

    enterZone(makeRace(), "swipe", 2, out);

    expect(out.events).toEqual([{ type: "begin", zone: "swipe", zoneIndex: 2 }]);
  });
});
