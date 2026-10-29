/** 端末ローカルの「今週」（月曜はじまり）に入る記録の数。未来の日時と不正な日時は数えない。 */
export function countThisWeek(loggedAt: readonly (string | Date)[], now: Date = new Date()): number {
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // getDay は日曜が 0。月曜はじまりにするため 6 日戻す。
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));

  return loggedAt.filter((value) => {
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && date >= weekStart && date <= now;
  }).length;
}
