import { describe, expect, it } from "vitest";

import { createReportAnalysis } from "./report-analysis";

describe("createReportAnalysis", () => {
  it("日別・曜日別・時間帯別の排便傾向と4週間推移を日本時間で集計する", () => {
    const analysis = createReportAnalysis({
      now: "2026-09-04T12:00:00.000Z",
      bowelLogs: [
        { loggedAt: "2026-09-01T00:30:00.000Z", hardness: 4 }, // 火 09:30
        { loggedAt: "2026-09-03T03:00:00.000Z", hardness: 6 }, // 木 12:00
        { loggedAt: "2026-08-27T03:00:00.000Z", hardness: 3 },
        { loggedAt: "2026-08-20T03:00:00.000Z", hardness: 5 },
      ],
      mealLogs: [],
    });

    expect(analysis.dailyCounts).toEqual([
      { date: "2026-08-31", count: 0 },
      { date: "2026-09-01", count: 1 },
      { date: "2026-09-02", count: 0 },
      { date: "2026-09-03", count: 1 },
      { date: "2026-09-04", count: 0 },
    ]);
    expect(analysis.weekdayCounts).toEqual({ mon: 0, tue: 1, wed: 0, thu: 1, fri: 0, sat: 0, sun: 0 });
    expect(analysis.timeOfDayCounts).toEqual({ morning: 1, afternoon: 1, evening: 0, night: 0 });
    expect(analysis.fourWeekTrend).toEqual([
      { weekStartsAt: "2026-08-09T15:00:00.000Z", bowelCount: 0, averageHardness: null },
      { weekStartsAt: "2026-08-16T15:00:00.000Z", bowelCount: 1, averageHardness: 5 },
      { weekStartsAt: "2026-08-23T15:00:00.000Z", bowelCount: 1, averageHardness: 3 },
      { weekStartsAt: "2026-08-30T15:00:00.000Z", bowelCount: 2, averageHardness: 5 },
    ]);
  });

  it("食品群は5件以上の記録かつ3件以上の関連がある場合だけ分析対象にする", () => {
    const analysis = createReportAnalysis({
      now: "2026-09-04T12:00:00.000Z",
      mealLogs: [
        { eatenAt: "2026-08-10T00:00:00.000Z", foodGroups: ["green_yellow_vegetables"] },
        { eatenAt: "2026-08-17T00:00:00.000Z", foodGroups: ["green_yellow_vegetables"] },
        { eatenAt: "2026-08-24T00:00:00.000Z", foodGroups: ["green_yellow_vegetables"] },
        { eatenAt: "2026-08-31T00:00:00.000Z", foodGroups: ["green_yellow_vegetables"] },
        { eatenAt: "2026-09-02T00:00:00.000Z", foodGroups: ["green_yellow_vegetables"] },
        { eatenAt: "2026-09-03T00:00:00.000Z", foodGroups: ["spicy_food"] },
      ],
      bowelLogs: [
        { loggedAt: "2026-08-10T06:00:00.000Z", hardness: 4 },
        { loggedAt: "2026-08-17T06:00:00.000Z", hardness: 5 },
        { loggedAt: "2026-08-24T06:00:00.000Z", hardness: 4 },
        { loggedAt: "2026-08-31T06:00:00.000Z", hardness: 5 },
        { loggedAt: "2026-09-02T06:00:00.000Z", hardness: 6 },
      ],
    });

    expect(analysis.mealFoodGroupAnalyses).toEqual([
      { foodGroup: "green_yellow_vegetables", mealCount: 5, relatedWithin24Hours: 5, relatedWithin48Hours: 5, averageHardnessWithin24Hours: 4.8, averageHardnessWithin48Hours: 4.8 },
    ]);
  });

  it("同じ排便が複数の食事と関連しても、分析の根拠件数には一度だけ数える", () => {
    const analysis = createReportAnalysis({
      now: "2026-09-04T12:00:00.000Z",
      mealLogs: Array.from({ length: 5 }, (_, index) => ({ eatenAt: `2026-09-01T0${index}:00:00.000Z`, foodGroups: ["green_yellow_vegetables"] })),
      bowelLogs: [{ id: "one-bowel", loggedAt: "2026-09-01T06:00:00.000Z", hardness: 4 }],
    });

    expect(analysis.mealFoodGroupAnalyses).toEqual([]);
  });
});
