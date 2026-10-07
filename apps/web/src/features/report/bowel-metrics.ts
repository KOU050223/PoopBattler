import { getBowelHardnessGroup, type BowelHardnessGroup } from "@/features/bowel-log/bowel-log.types";

export type BowelMetricLog = {
  loggedAt: string;
  hardness: number;
  ease: "easy" | "normal" | "hard";
};

export type Rate = number | null;

export type BowelShapeDistribution = Record<BowelHardnessGroup, { count: number; rate: Rate }>;

export type BowelPeriodMetrics = {
  bowelCount: number;
  shape: BowelShapeDistribution;
  easyRate: Rate;
  hardRate: Rate;
};

const GROUPS: BowelHardnessGroup[] = ["hard", "well_formed", "soft"];

function rate(count: number, total: number): Rate {
  return total === 0 ? null : Math.round((count / total) * 100);
}

/** Type 1〜2 / 3〜4 / 5〜7 と、出しやすさを同じ分母で集計する。 */
export function createBowelPeriodMetrics(logs: BowelMetricLog[]): BowelPeriodMetrics {
  const counts: Record<BowelHardnessGroup, number> = { hard: 0, well_formed: 0, soft: 0 };
  let easyCount = 0;
  let hardCount = 0;

  for (const log of logs) {
    counts[getBowelHardnessGroup(log.hardness)] += 1;
    if (log.ease === "easy") easyCount += 1;
    if (log.ease === "hard") hardCount += 1;
  }

  const bowelCount = logs.length;
  return {
    bowelCount,
    shape: Object.fromEntries(GROUPS.map((group) => [group, {
      count: counts[group],
      rate: rate(counts[group], bowelCount),
    }])) as BowelShapeDistribution,
    easyRate: rate(easyCount, bowelCount),
    hardRate: rate(hardCount, bowelCount),
  };
}

/** 昇順の値列の中央。偶数件では中央2値の平均を返す。 */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** 時系列順の排便間隔を時間で返す。同時刻は0時間として保持する。 */
export function getBowelIntervalsInHours(logs: Pick<BowelMetricLog, "loggedAt">[]): number[] {
  const times = logs
    .map((log) => new Date(log.loggedAt).getTime())
    .filter((time) => Number.isFinite(time))
    .sort((a, b) => a - b);

  return times.slice(1).map((time, index) => Math.round(((time - times[index]) / (60 * 60 * 1000)) * 10) / 10);
}
