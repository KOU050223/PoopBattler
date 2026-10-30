import { describe, expect, it } from "vitest";
import { DIRECTOR } from "../config";
import type { Presentation } from "../types";
import {
  applyPresentations,
  createOverlayState,
  expireOverlay,
  motionPlan,
  nextExpiryMs,
  OVERLAY_TIMING,
  PHOTO_FINISH_TEXT,
  placeRivalLabel,
} from "./overlay-state";

const NOW = 10_000;
const apply = (presentations: Presentation[], nowMs = NOW) => applyPresentations(createOverlayState(), presentations, nowMs);

describe("applyPresentations", () => {
  it("say を受けると実況の帯に文言がそのまま入り、sayMs 後に消える", () => {
    const state = apply([{ type: "say", text: "3位に上がった！", priority: 1 }]);
    expect(state.say).toMatchObject({ text: "3位に上がった！", untilMs: NOW + OVERLAY_TIMING.sayMs });
  });

  it("bigText を受けると文言と暗い色の指定がそのまま入り、bigTextMs 後に消える", () => {
    const state = apply([{ type: "bigText", text: "ゴツン！", isBad: true }]);
    expect(state.bigText).toMatchObject({ text: "ゴツン！", isBad: true, untilMs: NOW + OVERLAY_TIMING.bigTextMs });
  });

  it("大きな文字が続けて来ると、後の1枚だけが出て重ならない", () => {
    const state = apply([
      { type: "bigText", text: "2位に浮上！", isBad: false },
      { type: "bigText", text: "ゴツン！", isBad: true },
    ]);
    expect(state.bigText?.text).toBe("ゴツン！");
  });

  it("順位の大きな文字は、commentary の間隔より短く出るので次の文字と時間でも重ならない", () => {
    expect(OVERLAY_TIMING.bigTextMs).toBeLessThanOrEqual(DIRECTOR.bigTextIntervalMs);
  });

  it("同じ文言が続いても id が変わり、演出をやり直せる", () => {
    const first = apply([{ type: "bigText", text: "グッド", isBad: false }]);
    const second = applyPresentations(first, [{ type: "bigText", text: "グッド", isBad: false }], NOW + 100);
    expect(second.bigText?.id).not.toBe(first.bigText?.id);
  });

  it("photoFinish を受けると「写真判定…」を長めに出す", () => {
    const state = apply([{ type: "photoFinish" }]);
    expect(state.bigText).toMatchObject({ text: PHOTO_FINISH_TEXT, untilMs: NOW + OVERLAY_TIMING.photoFinishMs });
  });

  it("cutIn を受けると DIRECTOR.cutInMs の間カットインが出る", () => {
    const state = apply([{ type: "cutIn", name: "うんちくん", line: "ダッシュパーフェクト！" }]);
    expect(state.cutIn).toMatchObject({ name: "うんちくん", line: "ダッシュパーフェクト！", untilMs: NOW + DIRECTOR.cutInMs });
  });

  it("focusLines と cinema は on / off を持ち続け、時間では消えない", () => {
    const on = apply([{ type: "focusLines", on: true }, { type: "cinema", on: true }]);
    expect(expireOverlay(on, NOW + 60_000)).toMatchObject({ isFocusLines: true, isCinema: true });
    const off = applyPresentations(on, [{ type: "focusLines", on: false }], NOW);
    expect(off).toMatchObject({ isFocusLines: false, isCinema: true });
  });

  it("出来事が空なら同じ state を返す", () => {
    const state = createOverlayState();
    expect(applyPresentations(state, [], NOW)).toBe(state);
  });
});

describe("expireOverlay", () => {
  const shown = apply([
    { type: "say", text: "a", priority: 1 },
    { type: "bigText", text: "b", isBad: false },
  ]);

  it("bigText の時間だけ過ぎたら bigText だけ消え、実況は残る", () => {
    const state = expireOverlay(shown, NOW + OVERLAY_TIMING.bigTextMs);
    expect(state.bigText).toBeNull();
    expect(state.say).not.toBeNull();
  });

  it("どれも過ぎていなければ同じ参照を返す", () => {
    expect(expireOverlay(shown, NOW + 1)).toBe(shown);
  });

  it("nextExpiryMs は一番早く消える時刻を返し、何も出ていなければ null", () => {
    expect(nextExpiryMs(shown)).toBe(NOW + OVERLAY_TIMING.bigTextMs);
    expect(nextExpiryMs(createOverlayState())).toBeNull();
  });
});

describe("motionPlan", () => {
  it("reduce motion のとき、集中線は回らず明滅せず、黒帯とカットインは滑らず、大きな文字は弾まず、「＋」は散らない", () => {
    expect(motionPlan(true)).toEqual({
      focusLinesSpinSec: null,
      isFocusLinesFlicker: false,
      isBigTextPop: false,
      cinemaSlideMs: 0,
      cutInSlideMs: 0,
      isDashScatter: false,
    });
  });

  it("reduce motion でないとき、すべての動きが有効になる", () => {
    const plan = motionPlan(false);
    expect(plan.focusLinesSpinSec).toBeGreaterThan(0);
    expect(plan.cinemaSlideMs).toBeGreaterThan(0);
    expect(plan.cutInSlideMs).toBeGreaterThan(0);
    expect([plan.isFocusLinesFlicker, plan.isBigTextPop, plan.isDashScatter]).toEqual([true, true, true]);
  });
});

describe("placeRivalLabel", () => {
  const screen = { width: 375, height: 667 };
  const label = { width: 80, height: 24 };

  it("画面の外にいる子は出さない", () => {
    expect(placeRivalLabel({ x: 0, y: 0, isVisible: false }, screen, label).isVisible).toBe(false);
  });

  it("端に近い名札は、はみ出さないよう内側に寄せる", () => {
    expect(placeRivalLabel({ x: 5, y: 660, isVisible: true }, screen, label)).toEqual({ isVisible: true, x: 40, y: 655 });
  });

  it("内側にある名札はそのままの位置に出す", () => {
    expect(placeRivalLabel({ x: 200, y: 300, isVisible: true }, screen, label)).toEqual({ isVisible: true, x: 200, y: 300 });
  });
});
