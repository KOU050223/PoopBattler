import { describe, expect, it } from "vitest";
import { beginDash } from "../minigames/dash";
import { beginHurdle } from "../minigames/hurdle";
import type { SwipeState } from "../minigames/swipe";
import { isSamePanelSpec, panelSpecOf } from "./race-screen-panel";

const swipeGame = (arrowIndex: number): SwipeState => ({ kind: "swipe", perf: 0.5, arrows: ["left", "up"], arrowIndex, arrowStartSec: 0, results: [] });

describe("panelSpecOf", () => {
  it("区間の外（ミニゲームなし）ではパネルを出さない", () => {
    expect(panelSpecOf(null)).toBeNull();
  });

  it("ダッシュは種類だけ", () => {
    expect(panelSpecOf(beginDash())).toEqual({ kind: "dash", arrows: [], arrowIndex: 0 });
  });

  it("S字は矢印の並びと今の番号を持つ", () => {
    expect(panelSpecOf(swipeGame(1))).toEqual({ kind: "swipe", arrows: ["left", "up"], arrowIndex: 1 });
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
