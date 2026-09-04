import { describe, expect, it } from "vitest";

import { createWeeklyReport } from "./weekly-report";

describe("createWeeklyReport", () => {
  it("今週の排便を集計し、先週との差分と食事との記録上の関連を返す", () => {
    const report = createWeeklyReport({
      now: "2026-09-04T12:00:00.000Z",
      bowelLogs: [
        { loggedAt: "2026-09-01T00:30:00.000Z", hardness: 4, amount: "normal", color: "brown", ease: "easy" },
        { loggedAt: "2026-09-02T23:30:00.000Z", hardness: 5, amount: "large", color: "brown", ease: "normal" },
        { loggedAt: "2026-09-03T03:00:00.000Z", hardness: 6, amount: "small", color: "yellow", ease: "hard" },
        { loggedAt: "2026-08-30T10:00:00.000Z", hardness: 2, amount: "small", color: "green", ease: "hard" },
      ],
      mealLogs: [
        { eatenAt: "2026-09-01T12:00:00.000Z", foodGroups: ["green_yellow_vegetables"] },
        { eatenAt: "2026-09-02T12:00:00.000Z", foodGroups: ["green_yellow_vegetables"] },
        { eatenAt: "2026-09-03T00:00:00.000Z", foodGroups: ["spicy_food"] },
        { eatenAt: "2026-08-30T12:00:00.000Z", foodGroups: ["fruit"] },
      ],
    });

    expect(report.range).toEqual({
      startsAt: "2026-08-30T15:00:00.000Z",
      endsAt: "2026-09-04T12:00:00.000Z",
    });
    expect(report.summary).toEqual({
      bowelCount: 3,
      recordedDays: 2,
      countChangeFromPreviousWeek: 2,
      averageHardness: 5,
      stableRate: 67,
    });
    expect(report.breakdown.hardness).toEqual([0, 0, 0, 1, 1, 1, 0]);
    expect(report.breakdown.amount).toEqual({ small: 1, normal: 1, large: 1 });
    expect(report.meals).toEqual({ total: 3, byFoodGroup: { green_yellow_vegetables: 2, spicy_food: 1 } });
    expect(report.mealRelationships).toEqual([
      { foodGroup: "green_yellow_vegetables", relatedBowelCount: 2, averageHardness: 5.5 },
      { foodGroup: "spicy_food", relatedBowelCount: 1, averageHardness: 6 },
    ]);
  });

  it("今週の開始境界を含め、未来の記録と対象期間外の記録を除外する", () => {
    const report = createWeeklyReport({
      now: "2026-09-04T12:00:00.000Z",
      bowelLogs: [
        { loggedAt: "2026-08-30T15:00:00.000Z", hardness: 3, amount: "normal", color: "brown", ease: "easy" },
        { loggedAt: "2026-09-04T12:00:01.000Z", hardness: 4, amount: "normal", color: "brown", ease: "easy" },
        { loggedAt: "2026-08-30T14:59:59.999Z", hardness: 7, amount: "normal", color: "brown", ease: "easy" },
      ],
      mealLogs: [],
    });

    expect(report.summary.bowelCount).toBe(1);
    expect(report.breakdown.hardness).toEqual([0, 0, 1, 0, 0, 0, 0]);
  });

  it("週の開始前に食べたものも、その後24時間以内の排便との関連に含める", () => {
    const report = createWeeklyReport({
      now: "2026-09-01T18:00:00.000Z",
      bowelLogs: [{ loggedAt: "2026-08-30T16:00:00.000Z", hardness: 4, amount: "normal", color: "brown", ease: "easy" }],
      mealLogs: [{ eatenAt: "2026-08-30T14:30:00.000Z", foodGroups: ["fruit"] }],
    });

    expect(report.meals).toEqual({ total: 0, byFoodGroup: {} });
    expect(report.mealRelationships).toEqual([{ foodGroup: "fruit", relatedBowelCount: 1, averageHardness: 4 }]);
  });
});
