import { createBowelPeriodMetrics, getBowelIntervalsInHours, median, type BowelPeriodMetrics } from "./bowel-metrics";

export type AnalysisBowelLog = {
  id?: string;
  loggedAt: string;
  hardness: number;
  ease?: "easy" | "normal" | "hard";
};

export type AnalysisMealLog = {
  eatenAt: string;
  foodGroups: string[];
};

type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const WEEKDAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function startOfJstWeek(value: Date) {
  const jst = new Date(value.getTime() + JST_OFFSET_MS);
  const daysSinceMonday = (jst.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate() - daysSinceMonday) - JST_OFFSET_MS);
}

function jstDate(value: string) {
  return new Date(new Date(value).getTime() + JST_OFFSET_MS);
}

function jstDateKey(value: string) {
  return jstDate(value).toISOString().slice(0, 10);
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function averageHardness(logs: AnalysisBowelLog[]) {
  return logs.length === 0 ? null : round(logs.reduce((sum, log) => sum + log.hardness, 0) / logs.length);
}

function inRange(value: string, startsAt: Date, endsAt: Date) {
  const time = new Date(value).getTime();
  return time >= startsAt.getTime() && time <= endsAt.getTime();
}

/** 食後1〜2日を比較するために必要な、最低限の記録数。 */
export const MIN_MEAL_SAMPLE_COUNT = 5;
export const MIN_BOWEL_SAMPLE_COUNT = 3;
/** 初期値は、食事から24時間後を含み48時間後を含まない。 */
export const MEAL_BOWEL_ANALYSIS_WINDOW_HOURS = {
  startsAfterMeal: 24,
  endsAfterMeal: 48,
} as const;

export type MealFoodGroupAnalysis = {
  foodGroup: string;
  /** 48時間の観測が完了した食事記録のみを数える。 */
  mealCount: number;
  /** 対象食品群を食べた24〜48時間後にあった、重複なしの排便記録数。 */
  targetBowelCount: number;
  /** 対象期間を除いた通常時の排便記録数。 */
  baselineBowelCount: number;
  status: "ready" | "insufficient_samples";
  target: BowelPeriodMetrics | null;
  baseline: BowelPeriodMetrics | null;
  /** Type 3〜4の割合のポイント差（対象期間 - 通常時）。 */
  wellFormedRatePointDifference: number | null;
};

function isInMealBowelWindow(meal: AnalysisMealLog, bowel: AnalysisBowelLog) {
  const elapsed = new Date(bowel.loggedAt).getTime() - new Date(meal.eatenAt).getTime();
  return elapsed >= MEAL_BOWEL_ANALYSIS_WINDOW_HOURS.startsAfterMeal * 60 * 60 * 1000
    && elapsed < MEAL_BOWEL_ANALYSIS_WINDOW_HOURS.endsAfterMeal * 60 * 60 * 1000;
}

function createMealFoodGroupAnalysis(foodGroup: string, meals: AnalysisMealLog[], bowelLogs: AnalysisBowelLog[], endsAt: Date): MealFoodGroupAnalysis {
  // 48時間分を観測できない食事を混ぜると、直近に入力しただけで割合が下がる。
  const completedMeals = meals.filter((meal) => new Date(meal.eatenAt).getTime() + MEAL_BOWEL_ANALYSIS_WINDOW_HOURS.endsAfterMeal * 60 * 60 * 1000 <= endsAt.getTime());
  const targetIndexes = new Set<number>();

  bowelLogs.forEach((bowel, index) => {
    if (completedMeals.some((meal) => isInMealBowelWindow(meal, bowel))) targetIndexes.add(index);
  });

  const targetLogs = [...targetIndexes].map((index) => bowelLogs[index]);
  const baselineLogs = bowelLogs.filter((_, index) => !targetIndexes.has(index));
  const hasEnoughSamples = completedMeals.length >= MIN_MEAL_SAMPLE_COUNT
    && targetLogs.length >= MIN_BOWEL_SAMPLE_COUNT
    && baselineLogs.length >= MIN_BOWEL_SAMPLE_COUNT;

  if (!hasEnoughSamples) {
    return {
      foodGroup,
      mealCount: completedMeals.length,
      targetBowelCount: targetLogs.length,
      baselineBowelCount: baselineLogs.length,
      status: "insufficient_samples",
      target: null,
      baseline: null,
      wellFormedRatePointDifference: null,
    };
  }

  const target = createBowelPeriodMetrics(targetLogs.map((log) => ({ ...log, ease: log.ease ?? "normal" })));
  const baseline = createBowelPeriodMetrics(baselineLogs.map((log) => ({ ...log, ease: log.ease ?? "normal" })));
  return {
    foodGroup,
    mealCount: completedMeals.length,
    targetBowelCount: targetLogs.length,
    baselineBowelCount: baselineLogs.length,
    status: "ready",
    target,
    baseline,
    wellFormedRatePointDifference: target.shape.well_formed.rate! - baseline.shape.well_formed.rate!,
  };
}

export type ReportAnalysis = {
  dailyCounts: Array<{ date: string; count: number }>;
  weekdayCounts: Record<Weekday, number>;
  timeOfDayCounts: Record<TimeOfDay, number>;
  /** 表示週数を呼び出し側で増やせる長期推移。 */
  weeklyTrend: Array<{ weekStartsAt: string; metrics: BowelPeriodMetrics }>;
  /** 既存UIが移行するまでの互換ビュー。 */
  fourWeekTrend: Array<{ weekStartsAt: string; bowelCount: number; averageHardness: number | null }>;
  intervalHours: number[];
  medianIntervalHours: number | null;
  mealFoodGroupAnalyses: MealFoodGroupAnalysis[];
};

export function createReportAnalysis({ now, bowelLogs, mealLogs, trendWeekCount = 4 }: { now: string; bowelLogs: AnalysisBowelLog[]; mealLogs: AnalysisMealLog[]; trendWeekCount?: number }): ReportAnalysis {
  const endsAt = new Date(now);
  const startsAt = startOfJstWeek(endsAt);
  const fourWeekStartsAt = new Date(startsAt.getTime() - 3 * WEEK_MS);
  const currentLogs = bowelLogs.filter((log) => inRange(log.loggedAt, startsAt, endsAt));
  const weekdays: Record<Weekday, number> = { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 };
  const times: Record<TimeOfDay, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  const dates = new Map(currentLogs.map((log) => [jstDateKey(log.loggedAt), 0]));

  for (const log of currentLogs) {
    const date = jstDate(log.loggedAt);
    const weekday = WEEKDAYS[(date.getUTCDay() + 6) % 7];
    const hour = date.getUTCHours();
    weekdays[weekday] += 1;
    dates.set(jstDateKey(log.loggedAt), (dates.get(jstDateKey(log.loggedAt)) ?? 0) + 1);
    if (hour < 12) times.morning += 1;
    else if (hour < 18) times.afternoon += 1;
    else if (hour < 22) times.evening += 1;
    else times.night += 1;
  }

  const dailyCounts = Array.from({ length: Math.floor((endsAt.getTime() - startsAt.getTime()) / DAY_MS) + 1 }, (_, index) => {
    const date = new Date(startsAt.getTime() + index * DAY_MS);
    return { date: new Date(date.getTime() + JST_OFFSET_MS).toISOString().slice(0, 10), count: dates.get(new Date(date.getTime() + JST_OFFSET_MS).toISOString().slice(0, 10)) ?? 0 };
  });
  const trendStartsAt = new Date(startsAt.getTime() - (trendWeekCount - 1) * WEEK_MS);
  const weeklyTrend = Array.from({ length: trendWeekCount }, (_, index) => {
    const weekStartsAt = new Date(trendStartsAt.getTime() + index * WEEK_MS);
    const weekEndsAt = new Date(weekStartsAt.getTime() + WEEK_MS - 1);
    const logs = bowelLogs.filter((log) => inRange(log.loggedAt, weekStartsAt, weekEndsAt));
    return {
      weekStartsAt: weekStartsAt.toISOString(),
      metrics: createBowelPeriodMetrics(logs.map((log) => ({ ...log, ease: log.ease ?? "normal" }))),
    };
  });
  const fourWeekTrend = weeklyTrend.map((week) => {
    const weekEndsAt = new Date(new Date(week.weekStartsAt).getTime() + WEEK_MS - 1);
    const logs = bowelLogs.filter((log) => inRange(log.loggedAt, new Date(week.weekStartsAt), weekEndsAt));
    return { weekStartsAt: week.weekStartsAt, bowelCount: week.metrics.bowelCount, averageHardness: averageHardness(logs) };
  });
  const lookbackMeals = mealLogs.filter((meal) => inRange(meal.eatenAt, fourWeekStartsAt, endsAt));
  const lookbackBowelLogs = bowelLogs.filter((log) => inRange(log.loggedAt, fourWeekStartsAt, endsAt));
  const mealsByFoodGroup = Map.groupBy(lookbackMeals.flatMap((meal) => meal.foodGroups.map((foodGroup) => ({ ...meal, foodGroup }))), (meal) => meal.foodGroup);
  const mealFoodGroupAnalyses = [...mealsByFoodGroup.entries()]
    .map(([foodGroup, meals]) => createMealFoodGroupAnalysis(foodGroup, meals, lookbackBowelLogs, endsAt))
    .sort((a, b) => b.mealCount - a.mealCount || a.foodGroup.localeCompare(b.foodGroup));

  const intervalLogs = bowelLogs.filter((log) => inRange(log.loggedAt, fourWeekStartsAt, endsAt));
  const intervalHours = getBowelIntervalsInHours(intervalLogs);

  return {
    dailyCounts,
    weekdayCounts: weekdays,
    timeOfDayCounts: times,
    weeklyTrend,
    fourWeekTrend,
    intervalHours,
    medianIntervalHours: median(intervalHours),
    mealFoodGroupAnalyses,
  };
}
