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
    expect(placeholder.weekdayCounts).toHaveLength(7);
    expect(placeholder.timeOfDayCounts).toHaveLength(4);
    expect(placeholder.colorCounts).toHaveLength(4);
  });

  // 割合の帯は合計0だと「記録なし」に落ちる。見本がそこに落ちると、
  // 買った後に見えるものが伝わらない。どの成分も1以上を保つ。
  it("割合の帯に使う値は合計が0にならない", () => {
    for (const seed of [0, 1, 3, 12, 99]) {
      const placeholder = createTeaserPlaceholder(seed);
      for (const counts of [placeholder.timeOfDayCounts, placeholder.colorCounts]) {
        expect(Math.min(...counts)).toBeGreaterThanOrEqual(1);
      }
    }
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
