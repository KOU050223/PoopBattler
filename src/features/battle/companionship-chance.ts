/** 食事ログ件数ごとの仲間化確率。サーバーの `private.companionship_chance` と同じ。 */
export const COMPANIONSHIP_CHANCE_BY_COUNT = [0.5, 0.75, 0.85, 0.9] as const;

/** この件数以上は末尾の確率で頭打ち。 */
export const COMPANIONSHIP_MEAL_LOG_CAP = COMPANIONSHIP_CHANCE_BY_COUNT.length;

export function companionshipChance(mealLogCount: number): number {
  if (!Number.isInteger(mealLogCount) || mealLogCount <= 0) return 0;
  const cappedIndex = Math.min(mealLogCount, COMPANIONSHIP_CHANCE_BY_COUNT.length) - 1;
  return COMPANIONSHIP_CHANCE_BY_COUNT[cappedIndex];
}

export function companionshipChancePercent(mealLogCount: number): number {
  return Math.round(companionshipChance(mealLogCount) * 100);
}
