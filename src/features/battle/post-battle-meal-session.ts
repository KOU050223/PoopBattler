import {
  COMPANIONSHIP_MEAL_LOG_CAP,
  companionshipChancePercent,
} from "@/features/battle/companionship-chance";

/** ガチャに渡す食事は、この回で最後に記録したもの。未記録なら紐付けない。 */
export function mealLogIdForComplete(sessionMealLogIds: readonly string[]): string | null {
  return sessionMealLogIds.at(-1) ?? null;
}

export function postBattleCompleteLabel(sessionCount: number): string {
  return sessionCount === 0 ? "記録せずに完了する" : "完了する";
}

export function postBattleMealChanceCopy(existingCount: number, sessionCount: number): string {
  const total = existingCount + sessionCount;
  if (total === 0) {
    return `食事ログがないと仲間になりません。今回記録すると${companionshipChancePercent(1)}%、${COMPANIONSHIP_MEAL_LOG_CAP}件以上で${companionshipChancePercent(COMPANIONSHIP_MEAL_LOG_CAP)}%です。記録しなくてもバトルは完了できます。`;
  }

  const completeChance = companionshipChancePercent(total);
  const nextChance = companionshipChancePercent(total + 1);
  return `いま食事ログは${total}件です。完了すると${completeChance}%、もう1件記録すると${nextChance}%です。`;
}
