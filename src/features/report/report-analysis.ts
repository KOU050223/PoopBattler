export type AnalysisBowelLog = {
  id?: string;
  loggedAt: string;
  hardness: number;
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

function findRelatedBowelLogs(meals: AnalysisMealLog[], bowelLogs: AnalysisBowelLog[], windowMs: number) {
  const related: AnalysisBowelLog[] = [];
  const relatedIds = new Set<string>();
  for (const meal of meals) {
    const mealTime = new Date(meal.eatenAt).getTime();
    for (const bowel of bowelLogs) {
      const elapsed = new Date(bowel.loggedAt).getTime() - mealTime;
      const bowelId = bowel.id ?? bowel.loggedAt;
      if (elapsed >= 0 && elapsed <= windowMs && !relatedIds.has(bowelId)) {
        related.push(bowel);
        relatedIds.add(bowelId);
      }
    }
  }
  return related;
}

export type ReportAnalysis = {
  dailyCounts: Array<{ date: string; count: number }>;
  weekdayCounts: Record<Weekday, number>;
  timeOfDayCounts: Record<TimeOfDay, number>;
  fourWeekTrend: Array<{ weekStartsAt: string; bowelCount: number; averageHardness: number | null }>;
  mealFoodGroupAnalyses: Array<{
    foodGroup: string;
    mealCount: number;
    relatedWithin24Hours: number;
    relatedWithin48Hours: number;
    averageHardnessWithin24Hours: number | null;
    averageHardnessWithin48Hours: number | null;
  }>;
};

export function createReportAnalysis({ now, bowelLogs, mealLogs }: { now: string; bowelLogs: AnalysisBowelLog[]; mealLogs: AnalysisMealLog[] }): ReportAnalysis {
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
  const fourWeekTrend = Array.from({ length: 4 }, (_, index) => {
    const weekStartsAt = new Date(fourWeekStartsAt.getTime() + index * WEEK_MS);
    const weekEndsAt = new Date(weekStartsAt.getTime() + WEEK_MS - 1);
    const logs = bowelLogs.filter((log) => inRange(log.loggedAt, weekStartsAt, weekEndsAt));
    return { weekStartsAt: weekStartsAt.toISOString(), bowelCount: logs.length, averageHardness: averageHardness(logs) };
  });
  const lookbackMeals = mealLogs.filter((meal) => inRange(meal.eatenAt, fourWeekStartsAt, endsAt));
  const lookbackBowelLogs = bowelLogs.filter((log) => inRange(log.loggedAt, fourWeekStartsAt, endsAt));
  const mealsByFoodGroup = Map.groupBy(lookbackMeals.flatMap((meal) => meal.foodGroups.map((foodGroup) => ({ ...meal, foodGroup }))), (meal) => meal.foodGroup);
  const mealFoodGroupAnalyses = [...mealsByFoodGroup.entries()]
    .flatMap(([foodGroup, meals]) => {
      if (meals.length < 5) return [];
      const related24 = findRelatedBowelLogs(meals, lookbackBowelLogs, DAY_MS);
      if (related24.length < 3) return [];
      const related48 = findRelatedBowelLogs(meals, lookbackBowelLogs, DAY_MS * 2);
      return [{
        foodGroup,
        mealCount: meals.length,
        relatedWithin24Hours: related24.length,
        relatedWithin48Hours: related48.length,
        averageHardnessWithin24Hours: averageHardness(related24),
        averageHardnessWithin48Hours: averageHardness(related48),
      }];
    })
    .sort((a, b) => b.mealCount - a.mealCount || a.foodGroup.localeCompare(b.foodGroup));

  return { dailyCounts, weekdayCounts: weekdays, timeOfDayCounts: times, fourWeekTrend, mealFoodGroupAnalyses };
}
