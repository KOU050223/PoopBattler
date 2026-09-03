export type ReportBowelLog = {
  loggedAt: string;
  hardness: number;
  amount: "small" | "normal" | "large";
  color: "brown" | "dark_brown" | "yellow" | "green";
  ease: "easy" | "normal" | "hard";
};

export type ReportMealLog = {
  eatenAt: string;
  tag: string;
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
  };
  breakdown: {
    hardness: [number, number, number, number, number, number, number];
    amount: CountBy<ReportBowelLog["amount"]>;
    color: CountBy<ReportBowelLog["color"]>;
    ease: CountBy<ReportBowelLog["ease"]>;
  };
  meals: { total: number; byTag: Record<string, number> };
  mealRelationships: Array<{ tag: string; relatedBowelCount: number; averageHardness: number }>;
};

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

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
    relationshipMealStartsAt: new Date(startsAt.getTime() - DAY_MS),
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

export function createWeeklyReport({
  now,
  bowelLogs,
  mealLogs,
}: {
  now: string;
  bowelLogs: ReportBowelLog[];
  mealLogs: ReportMealLog[];
}): WeeklyReport {
  const { startsAt, endsAt, previousStartsAt, relationshipMealStartsAt } = getWeeklyReportRange(now);
  const currentBowelLogs = bowelLogs.filter((log) => isInRange(log.loggedAt, startsAt, endsAt));
  const previousBowelCount = bowelLogs.filter((log) => {
    const time = new Date(log.loggedAt).getTime();
    return time >= previousStartsAt.getTime() && time < startsAt.getTime();
  }).length;
  const currentMealLogs = mealLogs.filter((log) => isInRange(log.eatenAt, startsAt, endsAt));
  const hardness = [0, 0, 0, 0, 0, 0, 0] as WeeklyReport["breakdown"]["hardness"];
  const amount = emptyCounts(["small", "normal", "large"] as const);
  const color = emptyCounts(["brown", "dark_brown", "yellow", "green"] as const);
  const ease = emptyCounts(["easy", "normal", "hard"] as const);

  for (const log of currentBowelLogs) {
    hardness[log.hardness - 1] += 1;
    amount[log.amount] += 1;
    color[log.color] += 1;
    ease[log.ease] += 1;
  }

  const bowelCount = currentBowelLogs.length;
  const averageHardness = bowelCount === 0
    ? null
    : round(currentBowelLogs.reduce((total, log) => total + log.hardness, 0) / bowelCount);
  const stableRate = bowelCount === 0
    ? null
    : Math.round((currentBowelLogs.filter((log) => log.hardness >= 3 && log.hardness <= 5).length / bowelCount) * 100);
  const relatedByTag = new Map<string, ReportBowelLog[]>();

  const relationshipMealLogs = mealLogs.filter((log) => isInRange(log.eatenAt, relationshipMealStartsAt, endsAt));
  for (const meal of relationshipMealLogs) {
    const mealTime = new Date(meal.eatenAt).getTime();
    for (const bowel of currentBowelLogs) {
      const elapsed = new Date(bowel.loggedAt).getTime() - mealTime;
      if (elapsed >= 0 && elapsed <= DAY_MS) {
        const related = relatedByTag.get(meal.tag) ?? [];
        if (!related.some((entry) => entry.loggedAt === bowel.loggedAt)) related.push(bowel);
        relatedByTag.set(meal.tag, related);
      }
    }
  }

  return {
    range: { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() },
    summary: {
      bowelCount,
      recordedDays: new Set(currentBowelLogs.map((log) => new Date(new Date(log.loggedAt).getTime() + JST_OFFSET_MS).toISOString().slice(0, 10))).size,
      countChangeFromPreviousWeek: bowelCount - previousBowelCount,
      averageHardness,
      stableRate,
    },
    breakdown: { hardness, amount, color, ease },
    meals: {
      total: currentMealLogs.length,
      byTag: currentMealLogs.reduce<Record<string, number>>((counts, meal) => ({ ...counts, [meal.tag]: (counts[meal.tag] ?? 0) + 1 }), {}),
    },
    mealRelationships: [...relatedByTag.entries()]
      .map(([tag, related]) => ({
        tag,
        relatedBowelCount: related.length,
        averageHardness: round(related.reduce((total, bowel) => total + bowel.hardness, 0) / related.length),
      }))
      .sort((a, b) => b.relatedBowelCount - a.relatedBowelCount || a.tag.localeCompare(b.tag)),
  };
}
