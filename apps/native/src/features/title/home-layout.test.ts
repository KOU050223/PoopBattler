import { describe, expect, it } from "vitest";

import { bubbleSizes, companionSize, gachaBubbleSize, haloLayout } from "./home-layout";

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
  const WIDTHS = [360, 375, 390, 430];
  const HEIGHTS = [667, 800, 900];
  const SMALL_PILL_HEIGHT = 44;
  const TOP_ROOM = 12;

  // 傾いた楕円の、ある x での上の縁の y（箱の座標）。縦に走査して最初に中に入る点を探す。
  function edgeY(width: number, large: number, x: number) {
    const { cx, cy, rx, ry, rotation } = haloLayout(width, large);
    const rad = (rotation * Math.PI) / 180;
    for (let y = 0; y < 2000; y += 0.25) {
      const dx = x - cx;
      const dy = y - cy;
      const u = (dx * Math.cos(rad) + dy * Math.sin(rad)) / rx;
      const v = (-dx * Math.sin(rad) + dy * Math.cos(rad)) / ry;
      if (u * u + v * v <= 1) return y - TOP_ROOM;
    }
    return Infinity;
  }

  it.each(WIDTHS)("幅 %i では右へ向かって縁が下がる（左が高い）", (width) => {
    const large = bubbleSizes(width).large;
    expect(edgeY(width, large, 16 + large / 2)).toBeLessThan(edgeY(width, large, width - 16));
    expect(haloLayout(width, large).rotation).toBeGreaterThan(0);
  });

  it.each(WIDTHS)("幅 %i では縁が大きい泡の中心〜下を横切る", (width) => {
    const large = bubbleSizes(width).large;
    const y = edgeY(width, large, 16 + large / 2);
    expect(y).toBeGreaterThanOrEqual(large / 2);
    expect(y).toBeLessThanOrEqual(large);
  });

  it.each(WIDTHS)("幅 %i では右端の小さい泡のピルの上端に縁が来る", (width) => {
    const large = bubbleSizes(width).large;
    const pillTop = large + 28 - SMALL_PILL_HEIGHT;
    expect(Math.abs(edgeY(width, large, width - 16) - pillTop)).toBeLessThanOrEqual(1);
  });

  it.each(WIDTHS)("幅 %i では縁が相棒側（泡の列の上端より上）へ出ない", (width) => {
    const large = bubbleSizes(width).large;
    for (let x = 0; x <= width; x += 10) expect(edgeY(width, large, x)).toBeGreaterThanOrEqual(0);
  });

  it.each(WIDTHS)("幅 %i では箱が画面の幅いっぱいで、左右は画面の外へ出る", (width) => {
    const layout = haloLayout(width, bubbleSizes(width).large);
    expect(layout.width).toBe(width);
    expect(layout.left).toBe(0);
    expect(layout.cx - layout.rx).toBeLessThan(0);
  });

  it.each(HEIGHTS)("高さ %i でも台座の上端は相棒の余白（24）に収まり、相棒は最小 160 を保つ", (height) => {
    const large = bubbleSizes(375).large;
    expect(companionSize(height, large, 20)).toBeGreaterThanOrEqual(160);
    expect(-haloLayout(375, large).top).toBeLessThanOrEqual(24);
  });
});

describe("gachaBubbleSize", () => {
  it("下の小さい泡の4分の3", () => {
    expect(gachaBubbleSize(104)).toBe(78);
  });

  it("小さい泡が最小でもタップできる大きさ 44 を保つ", () => {
    expect(gachaBubbleSize(44)).toBe(44);
  });
});
