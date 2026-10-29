import type { MealFoodGroupAnalysis } from "@poopbattler/domain/report/report-analysis";
import { getMealFoodGroupLabel } from "@poopbattler/domain/records/meal.types";
import type { WeeklyReport } from "@poopbattler/domain/report/weekly-report";

/** 比較表の行。値が無い（記録ゼロで割合が出せない）ときは null のままにして、0% と区別する。 */
export type ComparisonRow = {
  key: "count" | "wellFormed" | "easy" | "hard";
  current: { value: number; unit: "count" | "percent" } | null;
  baseline: { value: number; unit: "count" | "percent" } | null;
};

export function toComparisonRows(report: WeeklyReport): ComparisonRow[] {
  const { current, pastFourWeeks, pastFourWeekAverageBowelCount } = report.comparison;
  const percent = (value: number | null) => (value === null ? null : { value, unit: "percent" as const });
  return [
    {
      key: "count",
      current: { value: current.bowelCount, unit: "count" },
      // 過去4週間に記録が無いときの 0 回は「少ない」ではなく「比べられない」。
      baseline: pastFourWeeks.bowelCount === 0 ? null : { value: pastFourWeekAverageBowelCount, unit: "count" },
    },
    { key: "wellFormed", current: percent(current.shape.well_formed.rate), baseline: percent(pastFourWeeks.shape.well_formed.rate) },
    { key: "easy", current: percent(current.easyRate), baseline: percent(pastFourWeeks.easyRate) },
    { key: "hard", current: percent(current.hardRate), baseline: percent(pastFourWeeks.hardRate) },
  ];
}

export type DailyBar = { date: string; count: number };

export function toDailyBars(report: WeeklyReport): DailyBar[] {
  return report.analysis.dailyCounts.map(({ date, count }) => ({ date, count }));
}

/** 棒の高さ(0〜1)。0回は描かない。1回でも見えるよう下限を持つ。 */
export function barRatio(count: number, max: number): number {
  if (count <= 0 || max <= 0) return 0;
  return Math.max(MIN_BAR_RATIO, count / max);
}
const MIN_BAR_RATIO = 0.12;

export type MealRelationRow = {
  foodGroupLabel: string;
  mealCount: number;
  targetRate: number;
  baselineRate: number;
};

const MAX_MEAL_ROWS = 3;

/**
 * 食べたあとの形の変化を、差が大きい順に並べる。
 * 標本が足りない食品群は domain が status で外しているので、ここでは再判定しない。
 */
export function toMealRelationRows(analyses: MealFoodGroupAnalysis[]): MealRelationRow[] {
  return analyses
    .filter((analysis) => analysis.status === "ready" && analysis.target && analysis.baseline)
    .map((analysis) => ({
      foodGroupLabel: getMealFoodGroupLabel(analysis.foodGroup),
      mealCount: analysis.mealCount,
      targetRate: analysis.target!.shape.well_formed.rate ?? 0,
      baselineRate: analysis.baseline!.shape.well_formed.rate ?? 0,
      difference: Math.abs(analysis.wellFormedRatePointDifference ?? 0),
    }))
    .sort((a, b) => b.difference - a.difference)
    .slice(0, MAX_MEAL_ROWS)
    .map(({ difference: _difference, ...row }) => row);
}
