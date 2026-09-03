/** 食事ログ1件あたりの仲間化確率。サーバーの `private.companionship_chance` と同じ。 */
export const COMPANIONSHIP_CHANCE_PER_MEAL_LOG = 0.25;

/** 抽選に使う食事ログ件数の上限。これ以上あっても確率は 100% のまま。 */
export const COMPANIONSHIP_MEAL_LOG_CAP = 4;

export function companionshipChance(mealLogCount: number): number {
  if (!Number.isInteger(mealLogCount) || mealLogCount <= 0) return 0;
  return Math.min(1, mealLogCount * COMPANIONSHIP_CHANCE_PER_MEAL_LOG);
}

export function companionshipChancePercent(mealLogCount: number): number {
  return Math.round(companionshipChance(mealLogCount) * 100);
}
