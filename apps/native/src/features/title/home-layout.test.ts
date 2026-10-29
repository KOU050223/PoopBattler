import { describe, expect, it } from "vitest";

import { bubbleSizes, companionSize, haloLayout } from "./home-layout";

const BUBBLE_COUNT_GAP_AND_PADDING = 32 + 12;

describe("bubbleSizes", () => {
  it.each([
    [360, 133, 91],
    [375, 139, 95],
    [390, 152, 104],
    [430, 152, 104],
  ])("幅 %i で大 %i・小 %i", (width, large, small) => {
    expect(bubbleSizes(width)).toEqual({ large, small });
  });

  it.each([360, 375])("幅 %i では泡3つが画面に収まる", (width) => {
    const { large, small } = bubbleSizes(width);
    expect(large + small * 2 + BUBBLE_COUNT_GAP_AND_PADDING).toBeLessThanOrEqual(width);
  });

  it("極端に狭くてもタップできる大きさ 44 を保つ", () => {
    expect(bubbleSizes(100)).toEqual({ large: 44, small: 44 });
  });
});

describe("companionSize", () => {
  // insets は上20 + 下0 = 20（SE 相当）。
  it.each([
    [640, 180],
    [667, 202],
    [800, 240],
    [900, 240],
  ])("高さ %i で相棒は %i", (height, expected) => {
    expect(companionSize(height, bubbleSizes(375).large, 20)).toBe(expected);
  });

  it("常に 160〜240 に収まる", () => {
    expect(companionSize(300, 152, 0)).toBe(160);
    expect(companionSize(2000, 152, 0)).toBe(240);
  });
});

describe("haloLayout", () => {
  it.each([
    [360, 408],
    [375, 423],
    [390, 438],
    [430, 478],
  ])("幅 %i で楕円の幅は %i（画面より左右 24 ずつ大きい）", (width, expected) => {
    expect(haloLayout(width, bubbleSizes(width).large).width).toBe(expected);
  });

  it.each([
    [360, 201],
    [375, 207],
    [390, 220],
    [430, 220],
  ])("幅 %i で楕円の高さは %i", (width, expected) => {
    expect(haloLayout(width, bubbleSizes(width).large).height).toBe(expected);
  });

  it("上は泡の上へ 12 だけ出て、左右は画面の外へ出る", () => {
    const { top, left } = haloLayout(375, 139);
    expect(top).toBe(-12);
    expect(left).toBe(-40);
  });

  it("375×667 でも楕円の上端は相棒の余白（24）に収まる", () => {
    const { top } = haloLayout(375, bubbleSizes(375).large);
    expect(-top).toBeLessThanOrEqual(24);
  });
});
