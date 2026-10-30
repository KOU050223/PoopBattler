import { describe, expect, it } from "vitest";

import { createWeeklyReport } from "@poopbattler/domain/report/weekly-report";

import { barRatio, toComparisonRows, toDailyBars, toMealRelationRows } from "./report-view-model";

const now = "2026-10-09T00:00:00Z";
const log = (loggedAt: string, hardness = 4, ease: "easy" | "normal" | "hard" = "easy") => ({ loggedAt, hardness, ease, amount: "normal" as const, color: "brown" as const });
const report = (bowelLogs: ReturnType<typeof log>[]) => createWeeklyReport({ now, bowelLogs, mealLogs: [] });

describe("toComparisonRows", () => {
  it("記録が無いと割合は null で、0% にならない", () => {
    const rows = toComparisonRows(report([]));
    expect(rows.find((row) => row.key === "easy")?.current).toBeNull();
    expect(rows.find((row) => row.key === "count")?.current).toEqual({ value: 0, unit: "count" });
  });

  it("本当の 0% は 0 のまま残る", () => {
    const rows = toComparisonRows(report([log("2026-10-06T00:00:00Z", 5, "hard")]));
    expect(rows.find((row) => row.key === "wellFormed")?.current).toEqual({ value: 0, unit: "percent" });
  });

  it("過去4週間に記録が無いと回数の比較は null", () => {
    const rows = toComparisonRows(report([log("2026-10-06T00:00:00Z")]));
    expect(rows[0].baseline).toBeNull();
  });

  it("過去4週間の週平均を回数の比較に使う", () => {
    const rows = toComparisonRows(report([log("2026-10-06T00:00:00Z"), log("2026-10-07T00:00:00Z"), log("2026-09-28T00:00:00Z")]));
    expect(rows[0].baseline).toEqual({ value: 0.3, unit: "count" });
  });
});

describe("toDailyBars", () => {
  it("今週の日ごとの回数を日付つきで返す", () => {
    const bars = toDailyBars(report([log("2026-10-06T00:00:00Z"), log("2026-10-06T01:00:00Z")]));
    expect(bars.find((bar) => bar.date === "2026-10-06")?.count).toBe(2);
  });
});

describe("barRatio", () => {
  it("0回は 0、最大は 1、1回は下限より低くならない", () => {
    expect(barRatio(0, 5)).toBe(0);
    expect(barRatio(5, 5)).toBe(1);
    expect(barRatio(1, 100)).toBeGreaterThan(0.1);
    expect(barRatio(3, 0)).toBe(0);
  });
});

describe("toMealRelationRows", () => {
  const base = { mealCount: 6, targetBowelCount: 4, baselineBowelCount: 4 };
  const metrics = (rate: number) => ({ shape: { well_formed: { count: 1, rate } } }) as never;
  const ready = (foodGroup: string, target: number, baseline: number) => ({
    ...base, foodGroup, status: "ready" as const, target: metrics(target), baseline: metrics(baseline), wellFormedRatePointDifference: target - baseline,
  });
  const lacking = { ...base, foodGroup: "fish", status: "insufficient_samples" as const, target: null, baseline: null, wellFormedRatePointDifference: null };

  it("標本が足りない食品群は出さない", () => {
    expect(toMealRelationRows([lacking])).toEqual([]);
  });

  it("差が大きい順に並べ、日本語のラベルにする", () => {
    const rows = toMealRelationRows([ready("rice", 60, 58), ready("seaweed", 80, 40), ready("meat", 30, 50)]);
    expect(rows.map((row) => row.foodGroupLabel)).toEqual(["海藻", "肉", "ごはん"]);
    expect(rows[0]).toEqual({ foodGroupLabel: "海藻", mealCount: 6, targetRate: 80, baselineRate: 40 });
  });

  it("3件までに絞る", () => {
    const rows = toMealRelationRows([ready("rice", 1, 2), ready("meat", 1, 3), ready("fish", 1, 4), ready("eggs", 1, 5)]);
    expect(rows).toHaveLength(3);
  });
});
