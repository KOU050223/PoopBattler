export type MealSlot = "morning" | "noon" | "evening";
export type MealDaySection<T> = { day: "today" | "yesterday" | "earlier"; logs: T[] };

const MORNING_START_HOUR = 4;
const NOON_START_HOUR = 11;
const EVENING_START_HOUR = 16;

/** 食べた時刻（端末ローカル）から あさ / ひる / よる を決める。深夜はよるに含める。 */
export function mealSlotOf(eatenAt: string | Date): MealSlot {
  const hour = new Date(eatenAt).getHours();
  if (hour >= MORNING_START_HOUR && hour < NOON_START_HOUR) return "morning";
  if (hour >= NOON_START_HOUR && hour < EVENING_START_HOUR) return "noon";
  return "evening";
}

/** 夏時間や時刻に左右されないよう、ローカル日付を通し日番号にする。 */
function toLocalDayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

/** 新しい順の記録を きょう / きのう / それより前 に分ける。空の区分は返さない。 */
export function groupMealLogsByDay<T extends { eatenAt: string }>(logs: readonly T[], now: Date = new Date()): MealDaySection<T>[] {
  const today = toLocalDayNumber(now);
  const sections: MealDaySection<T>[] = [
    { day: "today", logs: [] },
    { day: "yesterday", logs: [] },
    { day: "earlier", logs: [] },
  ];

  for (const log of logs) {
    const date = new Date(log.eatenAt);
    // 不正な日付は並べ先が決められないので出さない。
    if (Number.isNaN(date.getTime())) continue;
    const diff = today - toLocalDayNumber(date);
    sections[diff <= 0 ? 0 : diff === 1 ? 1 : 2]!.logs.push(log);
  }
  return sections.filter((section) => section.logs.length > 0);
}
