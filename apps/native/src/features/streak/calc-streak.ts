export type StreakResult = {
  /** 「れんぞく ○にち」。今日まだ記録がなくても昨日まで続いていれば切れない。 */
  streakDays: number;
  todayCount: number;
};

/** 端末ローカル時間の日付を、時刻・夏時間に依存しない通し日番号にする。 */
export function toLocalDayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

/** `loggedAt` は bowel_logs.logged_at（ISO文字列）または Date。 */
export function calcStreak(loggedAt: readonly (string | Date)[], now: Date = new Date()): StreakResult {
  const today = toLocalDayNumber(now);
  const loggedDays = new Set<number>();
  let todayCount = 0;

  for (const value of loggedAt) {
    const date = new Date(value);
    // 不正な日付は NaN になり日数計算を壊すので、数えない。
    if (Number.isNaN(date.getTime())) continue;
    const day = toLocalDayNumber(date);
    if (day > today) continue;
    loggedDays.add(day);
    if (day === today) todayCount += 1;
  }

  // 今日が未記録なら昨日から遡る。
  let cursor = loggedDays.has(today) ? today : today - 1;
  let streakDays = 0;
  while (loggedDays.has(cursor)) {
    streakDays += 1;
    cursor -= 1;
  }

  return { streakDays, todayCount };
}
