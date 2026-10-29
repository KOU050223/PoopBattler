import { describe, expect, it } from "vitest";
import { createRace } from "../engine";
import type { Presentation, RaceEvent } from "../types";
import { cameraInputOf, nextZoneDistance, triggerOf } from "./race-screen-camera";

const bump = (a: number, b: number): RaceEvent => ({ type: "bump", runners: [a, b], impulse: 1, x: 0, y: 0, z: 0 });
const rankChange = (from: number, to: number): RaceEvent => ({ type: "rankChange", from, to });
const cutIn: Presentation = { type: "cutIn", name: "うんちくん", line: "ダッシュパーフェクト！" };

describe("triggerOf", () => {
  it("自分が絡むぶつかりは bump", () => {
    expect(triggerOf([bump(0, 3)], [])).toBe("bump");
  });

  it("自分以外どうしのぶつかりはきっかけにしない", () => {
    expect(triggerOf([bump(2, 3)], [])).toBeNull();
  });

  it("順位が上がったら overtake、下がったときは何もしない", () => {
    expect([triggerOf([rankChange(5, 4)], []), triggerOf([rankChange(4, 5)], [])]).toEqual(["overtake", null]);
  });

  it("カットインの演出が出たら cutin", () => {
    expect(triggerOf([], [cutIn])).toBe("cutin");
  });

  it("ぶつかり・抜き・カットインが同時なら、ぶつかり > 抜き > カットインの順に選ぶ", () => {
    expect([triggerOf([rankChange(5, 4), bump(0, 1)], [cutIn]), triggerOf([rankChange(5, 4)], [cutIn])]).toEqual(["bump", "overtake"]);
  });

  it("何も起きていなければ null", () => {
    expect(triggerOf([], [{ type: "say", text: "x", priority: 1 }])).toBeNull();
  });
});

describe("cameraInputOf", () => {
  const race = createRace({ seed: 1, racers: { player: { stamina: 5, power: 5, technique: 5 } }, collisions: false });

  it("画面の縦横比とスタート前かどうかをそのまま渡す", () => {
    const input = cameraInputOf(race, [], 9 / 19, true, null);

    expect([input.aspect, input.isPreStart]).toEqual([9 / 19, true]);
  });

  it("走者の数だけ director 用の走者を作り、同じ配列を使い回す", () => {
    const cameraRunners: ReturnType<typeof cameraInputOf>["runners"] extends readonly (infer T)[] ? T[] : never = [];
    const first = cameraInputOf(race, cameraRunners, 1, false, null).runners;
    const second = cameraInputOf(race, cameraRunners, 1, false, null).runners;

    expect([first.length, second[0] === first[0]]).toEqual([race.runners.length, true]);
  });
});

describe("nextZoneDistance", () => {
  it("スタート位置から最初のミニゲーム区間の入口までの距離を返す", () => {
    const race = createRace({ seed: 1, racers: { player: { stamina: 5, power: 5, technique: 5 } }, collisions: false });
    const firstZone = race.course.sections.find((section) => section.kind === "zone")!;

    expect(nextZoneDistance(race)).toBeCloseTo(firstZone.startS - race.runners[0].s);
  });

  it("最後の区間を過ぎたら null", () => {
    const race = createRace({ seed: 1, racers: { player: { stamina: 5, power: 5, technique: 5 } }, collisions: false });
    race.runners[0].s = race.course.finishS;

    expect(nextZoneDistance(race)).toBeNull();
  });
});
