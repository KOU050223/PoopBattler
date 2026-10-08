// JST 基準の表示用フォーマット。Hermes 上の Intl.DateTimeFormat の
// timeZone サポートに依存しないよう、オフセット加算で日付を作る
// （domain の weekly-report.ts と同じ考え方）。

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** "2026-10-05T15:00:00Z" → "10/6"（JST の月/日）。 */
export function formatJstMonthDay(value: string | Date): string {
  const time = typeof value === "string" ? new Date(value).getTime() : value.getTime();
  const jst = new Date(time + JST_OFFSET_MS);
  return `${jst.getUTCMonth() + 1}/${jst.getUTCDate()}`;
}

/** "2026-10-05T15:00:00Z" → "2026/10/6"（JST の年月日。購読期間の表示用）。 */
export function formatJstDate(value: string | Date): string {
  const time = typeof value === "string" ? new Date(value).getTime() : value.getTime();
  const jst = new Date(time + JST_OFFSET_MS);
  return `${jst.getUTCFullYear()}/${jst.getUTCMonth() + 1}/${jst.getUTCDate()}`;
}

/** "2026-10-05"（JST 日付キー）→ 曜日 index（月=0 … 日=6）。 */
export function jstWeekdayIndex(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}
