import { describe, expect, it } from "vitest";
import { beginDash } from "../minigames/dash";
import { beginHurdle } from "../minigames/hurdle";
import type { SwipeState } from "../minigames/swipe";
import { MINI_GAME } from "../config";
import { generateCourseFromSeed } from "../course";
import { isSamePanelSpec, panelSpecOf, upcomingZoneOf } from "./race-screen-panel";

const swipeGame = (arrowIndex: number): SwipeState => ({ kind: "swipe", perf: 0.5, arrows: ["left", "up"], arrowIndex, arrowStartSec: 0, results: [] });

describe("panelSpecOf", () => {
  it("区間の外（ミニゲームなし）ではパネルを出さない", () => {
    expect(panelSpecOf(null)).toBeNull();
  });

  it("ダッシュは種類だけ", () => {
    expect(panelSpecOf(beginDash())).toEqual({ kind: "dash", arrows: [], arrowIndex: 0, isReady: false });
  });

  it("S字は矢印の並びと今の番号を持つ", () => {
    expect(panelSpecOf(swipeGame(1))).toEqual({ kind: "swipe", arrows: ["left", "up"], arrowIndex: 1, isReady: false });
  });
});

describe("isSamePanelSpec", () => {
  it("ダッシュのゲージが動いても同じパネル（再描画しない）", () => {
    const game = beginDash();
    const before = panelSpecOf(game);
    game.perf = 0.9;

    expect(isSamePanelSpec(before, panelSpecOf(game))).toBe(true);
  });

  it("S字で矢印の番号が進んだら別のパネル", () => {
    const game = swipeGame(0);
    const before = panelSpecOf(game);
    game.arrowIndex = 1;

    expect(isSamePanelSpec(before, panelSpecOf(game))).toBe(false);
  });

  it("種類が変わったら別のパネル", () => {
    expect(isSamePanelSpec(panelSpecOf(beginDash()), panelSpecOf(beginHurdle(0.5)))).toBe(false);
  });

  it("どちらも出さない状態どうしは同じ、片方だけ出すなら別", () => {
    expect([isSamePanelSpec(null, null), isSamePanelSpec(null, panelSpecOf(beginDash()))]).toEqual([true, false]);
  });
});

describe("予告中の準備中パネル", () => {
  it("区間の外で予告もまだなら出さない", () => {
    expect(panelSpecOf(null, null)).toBeNull();
  });

  it("予告中（ミニゲームなし）は準備中として種類だけ持つ", () => {
    expect(panelSpecOf(null, "swipe")).toEqual({ kind: "swipe", arrows: [], arrowIndex: 0, isReady: true });
  });

  it("区間に入ったら予告があっても本番を優先する", () => {
    expect(panelSpecOf(beginDash(), "dash")?.isReady).toBe(false);
  });

  it("準備中と本番は同じ種類でも別のパネル", () => {
    expect(isSamePanelSpec(panelSpecOf(null, "dash"), panelSpecOf(beginDash()))).toBe(false);
  });
});

describe("upcomingZoneOf", () => {
  const course = generateCourseFromSeed(42);
  const zone = course.sections.find((section) => section.kind === "zone")!;
  const endS = zone.startS + zone.length;

  it("予告の距離ちょうどの手前ではまだ出さない", () => {
    expect(upcomingZoneOf(course, zone.startS - MINI_GAME.announceAhead)).toBeNull();
  });

  it("予告の距離に入った直後から次の区間の種類を返す", () => {
    expect(upcomingZoneOf(course, zone.startS - MINI_GAME.announceAhead + 0.01)).toBe(zone.zone);
  });

  it("区間の入口の手前までは返す", () => {
    expect(upcomingZoneOf(course, zone.startS - 0.01)).toBe(zone.zone);
  });

  it("区間の中に入ったら今の区間は返さない（次の区間も遠い）", () => {
    expect(upcomingZoneOf(course, zone.startS + 1)).toBeNull();
  });

  it("区間を出た直後はなし", () => {
    expect(upcomingZoneOf(course, endS + 0.01)).toBeNull();
  });

  it("最後の区間を過ぎたらなし", () => {
    expect(upcomingZoneOf(course, course.finishS - 1)).toBeNull();
  });
});
