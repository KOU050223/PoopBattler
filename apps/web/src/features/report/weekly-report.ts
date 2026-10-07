import { createReportAnalysis, type ReportAnalysis } from "./report-analysis";
import { createBowelPeriodMetrics, type BowelPeriodMetrics } from "./bowel-metrics";
import { getBowelHardnessGroup, type BowelColor } from "@/features/bowel-log/bowel-log.types";

export type ReportBowelLog = {
  loggedAt: string;
  hardness: number;
  amount: "small" | "normal" | "large";
  color: BowelColor;
  ease: "easy" | "normal" | "hard";
};

export type ReportMealLog = {
  eatenAt: string;
  foodGroups: string[];
};

type CountBy<T extends string> = Record<T, number>;

export type WeeklyReport = {
  range: { startsAt: string; endsAt: string };
  summary: {
    bowelCount: number;
    recordedDays: number;
    countChangeFromPreviousWeek: number;
    averageHardness: number | null;
    stableRate: number | null;
    /** Type 1〜2 / 3〜4 / 5〜7 と出しやすさ。以後のUIはこちらを主指標にする。 */
    metrics: BowelPeriodMetrics;
  };
  comparison: {
    current: BowelPeriodMetrics;
    /** 今週を含めない直近4週間の集計。 */
    pastFourWeeks: BowelPeriodMetrics;
    /** 回数だけは週あたりの平均で比較する。 */
    pastFourWeekAverageBowelCount: number;
  };
  breakdown: {
    hardness: [number, number, number, number, number, number, number];
    amount: CountBy<ReportBowelLog["amount"]>;
    color: CountBy<ReportBowelLog["color"]>;
    ease: CountBy<ReportBowelLog["ease"]>;
  };
  meals: { total: number; byFoodGroup: Record<string, number> };
  analysis: ReportAnalysis;
};

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function startOfJstWeek(value: Date) {
  const jst = new Date(value.getTime() + JST_OFFSET_MS);
  const daysSinceMonday = (jst.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate() - daysSinceMonday) - JST_OFFSET_MS);
}

/** 今週と比較対象の先週を取得する。週は日本時間の月曜始まり。 */
export function getWeeklyReportRange(now: string) {
  const endsAt = new Date(now);
  const startsAt = startOfJstWeek(endsAt);
  return {
    startsAt,
    endsAt,
    previousStartsAt: new Date(startsAt.getTime() - WEEK_MS),
  };
}

function isInRange(value: string, startsAt: Date, endsAt: Date) {
  const time = new Date(value).getTime();
  return time >= startsAt.getTime() && time <= endsAt.getTime();
}

function emptyCounts<T extends string>(keys: readonly T[]): CountBy<T> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as CountBy<T>;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

export function createWeeklyReport({
  now,
  bowelLogs,
  mealLogs,
}: {
  now: string;
  bowelLogs: ReportBowelLog[];
  mealLogs: ReportMealLog[];
}): WeeklyReport {
  const { startsAt, endsAt, previousStartsAt } = getWeeklyReportRange(now);
  const currentBowelLogs = bowelLogs.filter((log) => isInRange(log.loggedAt, startsAt, endsAt));
  const pastFourWeeksStartsAt = new Date(startsAt.getTime() - 4 * WEEK_MS);
  const pastFourWeekLogs = bowelLogs.filter((log) => {
    const time = new Date(log.loggedAt).getTime();
    return time >= pastFourWeeksStartsAt.getTime() && time < startsAt.getTime();
  });
  const previousBowelCount = bowelLogs.filter((log) => {
    const time = new Date(log.loggedAt).getTime();
    return time >= previousStartsAt.getTime() && time < startsAt.getTime();
  }).length;
  const currentMealLogs = mealLogs.filter((log) => isInRange(log.eatenAt, startsAt, endsAt));
  const hardness = [0, 0, 0, 0, 0, 0, 0] as WeeklyReport["breakdown"]["hardness"];
  const amount = emptyCounts(["small", "normal", "large"] as const);
  const color = emptyCounts(["brown", "dark_brown", "yellow", "green", "red", "black", "white_gray", "other"] as const);
  const ease = emptyCounts(["easy", "normal", "hard"] as const);

  for (const log of currentBowelLogs) {
    hardness[log.hardness - 1] += 1;
    amount[log.amount] += 1;
    color[log.color] += 1;
    ease[log.ease] += 1;
  }

  const bowelCount = currentBowelLogs.length;
  const currentMetrics = createBowelPeriodMetrics(currentBowelLogs);
  const pastFourWeeksMetrics = createBowelPeriodMetrics(pastFourWeekLogs);
  const averageHardness = bowelCount === 0
    ? null
    : round(currentBowelLogs.reduce((total, log) => total + log.hardness, 0) / bowelCount);
  const stableRate = bowelCount === 0
    ? null
    : Math.round((currentBowelLogs.filter((log) => getBowelHardnessGroup(log.hardness) === "well_formed").length / bowelCount) * 100);
  const analysis = createReportAnalysis({ now, bowelLogs, mealLogs });
  return {
    range: { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() },
    summary: {
      bowelCount,
      recordedDays: new Set(currentBowelLogs.map((log) => new Date(new Date(log.loggedAt).getTime() + JST_OFFSET_MS).toISOString().slice(0, 10))).size,
      countChangeFromPreviousWeek: bowelCount - previousBowelCount,
      averageHardness,
      stableRate,
      metrics: currentMetrics,
    },
    comparison: {
      current: currentMetrics,
      pastFourWeeks: pastFourWeeksMetrics,
      pastFourWeekAverageBowelCount: roundToOneDecimal(pastFourWeeksMetrics.bowelCount / 4),
    },
    breakdown: { hardness, amount, color, ease },
    meals: {
      total: currentMealLogs.length,
      byFoodGroup: currentMealLogs.flatMap((meal) => meal.foodGroups).reduce<Record<string, number>>((counts, foodGroup) => ({ ...counts, [foodGroup]: (counts[foodGroup] ?? 0) + 1 }), {}),
    },
    analysis,
  };
}
