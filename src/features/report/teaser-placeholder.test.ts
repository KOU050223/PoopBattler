import { describe, expect, it } from "vitest";

import { createTeaserPlaceholder } from "./teaser-placeholder";

describe("createTeaserPlaceholder", () => {
  // 再レンダリングのたびに数字が変わるとチープに見えるため、
  // 同じシードからは必ず同じ値が出ることを固定する。
  it("同じシードからは同じ値を返す", () => {
    expect(createTeaserPlaceholder(7)).toEqual(createTeaserPlaceholder(7));
  });

  it("シードが違えば違う値になる", () => {
    expect(createTeaserPlaceholder(7)).not.toEqual(createTeaserPlaceholder(8));
  });

  // 件数0の利用者にも、レポートの形が伝わる値を出す必要がある。
  it("シードが0でもレポートの形を保った値を返す", () => {
    const placeholder = createTeaserPlaceholder(0);
    expect(placeholder.metrics).toHaveLength(4);
    expect(placeholder.hardnessHeights).toHaveLength(7);
    expect(placeholder.fourWeekTrend).toHaveLength(4);
    expect(placeholder.mealFoodGroups).toHaveLength(3);
  });

  it("棒グラフの高さは表示できる範囲に収まる", () => {
    for (const seed of [0, 1, 3, 12, 99]) {
      for (const height of createTeaserPlaceholder(seed).hardnessHeights) {
        expect(height).toBeGreaterThanOrEqual(12);
        expect(height).toBeLessThanOrEqual(100);
      }
    }
  });
});
