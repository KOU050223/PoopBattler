import { describe, expect, it } from "vitest";

import { bubbleSizes, companionSize } from "./home-layout";

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
