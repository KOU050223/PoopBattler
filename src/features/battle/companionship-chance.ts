/** 食事写真1枚あたりの仲間化確率。サーバーの `private.companionship_chance` と同じ。 */
export const COMPANIONSHIP_CHANCE_PER_PHOTO = 0.25;

/** 抽選に使う写真枚数の上限。これ以上足しても確率は 100% のまま。 */
export const COMPANIONSHIP_PHOTO_CAP = 4;

export function companionshipChance(photoCount: number): number {
  if (!Number.isInteger(photoCount) || photoCount <= 0) return 0;
  return Math.min(1, photoCount * COMPANIONSHIP_CHANCE_PER_PHOTO);
}

export function companionshipChancePercent(photoCount: number): number {
  return Math.round(companionshipChance(photoCount) * 100);
}
