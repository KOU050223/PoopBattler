import type { BattleHistoryLog } from "./battle-history-gateway";

/** 日曜はじまりの週の並び。null は月の前後の空きマス。 */
export function buildMonthGrid(year: number, monthIndex: number): (number | null)[][] {
  const leadingBlanks = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}

/** 指定した月のうち、うんちの記録がある日（1始まり）。日付は端末のローカル時間で見る。 */
export function loggedDaysInMonth(
  logs: readonly Pick<BattleHistoryLog, "completedAt" | "bowelLog">[],
  year: number,
  monthIndex: number,
): Set<number> {
  const days = new Set<number>();
  for (const log of logs) {
    if (!log.bowelLog) continue;
    const date = new Date(log.completedAt);
    // 不正な日付は NaN 同士の比較で偽になるが、意図を明示して除く。
    if (Number.isNaN(date.getTime())) continue;
    if (date.getFullYear() === year && date.getMonth() === monthIndex) days.add(date.getDate());
  }
  return days;
}

export type RecentLog = { battleId: string; completedAt: string; hardness: number };

/** 記録つきのものだけを新しい順に最大 limit 件。ゲートウェイの並びには頼らない。 */
export function pickRecentLogs(logs: readonly BattleHistoryLog[], limit: number): RecentLog[] {
  return logs
    .flatMap((log) => (log.bowelLog ? [{ battleId: log.battleId, completedAt: log.completedAt, hardness: log.bowelLog.hardness }] : []))
    .filter((log) => !Number.isNaN(new Date(log.completedAt).getTime()))
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, limit);
}

export type DayLabel = { kind: "today" | "yesterday" | "date"; month: number; day: number; time: string };

export function toDayLabel(completedAt: string, now: Date = new Date()): DayLabel {
  const date = new Date(completedAt);
  const dayStart = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());
  // 夏時間の日でも 24h 固定にならないよう、日付のズレは暦日で数える。
  const diffDays = Math.round((dayStart(now).getTime() - dayStart(date).getTime()) / 86_400_000);
  const time = `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
  const kind = diffDays === 0 ? "today" : diffDays === 1 ? "yesterday" : "date";
  return { kind, month: date.getMonth() + 1, day: date.getDate(), time };
}
