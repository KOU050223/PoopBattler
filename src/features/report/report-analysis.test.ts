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
    expect(analysis.weeklyTrend.map((week) => week.metrics.shape.well_formed.rate)).toEqual([null, 0, 100, 50]);
    expect(analysis.intervalHours).toEqual([168, 117.5, 50.5]);
    expect(analysis.medianIntervalHours).toBe(117.5);
  });

  it("食品群ごとに食後24〜48時間のType 3〜4割合を通常時とポイント差で比較する", () => {
    const analysis = createReportAnalysis({
      now: "2026-09-04T12:00:00.000Z",
      mealLogs: [
        { eatenAt: "2026-08-10T00:00:00.000Z", foodGroups: ["green_yellow_vegetables"] },
        { eatenAt: "2026-08-13T00:00:00.000Z", foodGroups: ["green_yellow_vegetables"] },
        { eatenAt: "2026-08-16T00:00:00.000Z", foodGroups: ["green_yellow_vegetables"] },
        { eatenAt: "2026-08-19T00:00:00.000Z", foodGroups: ["green_yellow_vegetables"] },
        { eatenAt: "2026-08-22T00:00:00.000Z", foodGroups: ["green_yellow_vegetables"] },
      ],
      bowelLogs: [
        { loggedAt: "2026-08-11T06:00:00.000Z", hardness: 3 },
        { loggedAt: "2026-08-14T06:00:00.000Z", hardness: 4 },
        { loggedAt: "2026-08-17T06:00:00.000Z", hardness: 4 },
        { loggedAt: "2026-08-20T06:00:00.000Z", hardness: 3 },
        { loggedAt: "2026-08-23T06:00:00.000Z", hardness: 5 },
        { loggedAt: "2026-08-12T00:00:00.000Z", hardness: 2 },
        { loggedAt: "2026-08-15T00:00:00.000Z", hardness: 6 },
        { loggedAt: "2026-08-18T00:00:00.000Z", hardness: 2 },
      ],
    });

    expect(analysis.mealFoodGroupAnalyses).toEqual([
      {
        foodGroup: "green_yellow_vegetables",
        mealCount: 5,
        targetBowelCount: 5,
        baselineBowelCount: 3,
        status: "ready",
        target: { bowelCount: 5, shape: { hard: { count: 0, rate: 0 }, well_formed: { count: 4, rate: 80 }, soft: { count: 1, rate: 20 } }, easyRate: 0, hardRate: 0 },
        baseline: { bowelCount: 3, shape: { hard: { count: 2, rate: 67 }, well_formed: { count: 0, rate: 0 }, soft: { count: 1, rate: 33 } }, easyRate: 0, hardRate: 0 },
        wellFormedRatePointDifference: 80,
      },
    ]);
  });

  it("食事件数・対象排便件数・通常時の記録が最低数に届かない食品群は不足状態で返す", () => {
    const analysis = createReportAnalysis({
      now: "2026-09-04T12:00:00.000Z",
      mealLogs: Array.from({ length: 5 }, (_, index) => ({ eatenAt: `2026-08-${10 + index}T00:00:00.000Z`, foodGroups: ["green_yellow_vegetables"] })),
      bowelLogs: [{ id: "one-bowel", loggedAt: "2026-08-12T06:00:00.000Z", hardness: 4 }],
    });

    expect(analysis.mealFoodGroupAnalyses).toEqual([
      {
        foodGroup: "green_yellow_vegetables",
        mealCount: 5,
        targetBowelCount: 1,
        baselineBowelCount: 0,
        status: "insufficient_samples",
        target: null,
        baseline: null,
        wellFormedRatePointDifference: null,
      },
    ]);
  });

  it("同じ食品群の複数の食事に該当する排便は対象件数へ一度だけ数える", () => {
    const analysis = createReportAnalysis({
      now: "2026-09-04T12:00:00.000Z",
      mealLogs: Array.from({ length: 5 }, (_, index) => ({ eatenAt: `2026-08-10T0${index}:00:00.000Z`, foodGroups: ["green_yellow_vegetables"] })),
      bowelLogs: [{ id: "one-bowel", loggedAt: "2026-08-11T06:00:00.000Z", hardness: 4 }],
    });

    expect(analysis.mealFoodGroupAnalyses[0]).toMatchObject({ targetBowelCount: 1, status: "insufficient_samples" });
  });

  it("食後24時間ちょうどを対象に含め、48時間ちょうどを通常時として扱う", () => {
    const mealLogs = ["01", "04", "07", "10", "13"].map((day) => ({ eatenAt: `2026-08-${day}T00:00:00.000Z`, foodGroups: ["fruit"] }));
    const bowelLogs = ["02", "05", "08", "11", "14"].flatMap((day, index) => [
      { loggedAt: `2026-08-${day}T00:00:00.000Z`, hardness: 3 },
      { loggedAt: `2026-08-${String(Number(day) + 1).padStart(2, "0")}T00:00:00.000Z`, hardness: index % 2 === 0 ? 2 : 6 },
    ]);
    const analysis = createReportAnalysis({ now: "2026-08-20T00:00:00.000Z", mealLogs, bowelLogs });

    expect(analysis.mealFoodGroupAnalyses[0]).toMatchObject({
      mealCount: 5,
      targetBowelCount: 5,
      baselineBowelCount: 5,
      status: "ready",
      wellFormedRatePointDifference: 100,
    });
  });

  it("排便記録が0件でも食品群を返し、割合を作らず不足状態にする", () => {
    const analysis = createReportAnalysis({
      now: "2026-09-04T12:00:00.000Z",
      mealLogs: Array.from({ length: 5 }, (_, index) => ({ eatenAt: `2026-08-${10 + index}T00:00:00.000Z`, foodGroups: ["fruit"] })),
      bowelLogs: [],
    });

    expect(analysis.mealFoodGroupAnalyses).toEqual([
      {
        foodGroup: "fruit",
        mealCount: 5,
        targetBowelCount: 0,
        baselineBowelCount: 0,
        status: "insufficient_samples",
        target: null,
        baseline: null,
        wellFormedRatePointDifference: null,
      },
    ]);
  });

  it("排便間隔の中央値は偶数件・同時刻を含めても時系列順に求め、推移は週数を拡張できる", () => {
    const analysis = createReportAnalysis({
      now: "2026-09-04T12:00:00.000Z",
      bowelLogs: [
        { loggedAt: "2026-08-10T00:00:00.000Z", hardness: 3 },
        { loggedAt: "2026-08-11T00:00:00.000Z", hardness: 4 },
        { loggedAt: "2026-08-11T00:00:00.000Z", hardness: 5 },
        { loggedAt: "2026-08-13T00:00:00.000Z", hardness: 2 },
        { loggedAt: "2026-08-16T00:00:00.000Z", hardness: 7 },
      ],
      mealLogs: [],
      trendWeekCount: 8,
    });

    expect(analysis.intervalHours).toEqual([24, 0, 48, 72]);
    expect(analysis.medianIntervalHours).toBe(36);
    expect(analysis.weeklyTrend).toHaveLength(8);
  });
});
