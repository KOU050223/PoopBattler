/** 確定済みバトルの総数から、今回が初回の完了かを判定する。 */
export function isFirstCompletedBattle(completedBattleCount: number) {
  return completedBattleCount === 1;
}

/** 初回完了済みなら、導入イベントが後から届いても次の結果画面で案内できる。 */
export function shouldRememberInstallPromotionEligibility(
  isFirstCompletedBattle: boolean,
  hasRememberedEligibility: boolean,
) {
  return isFirstCompletedBattle || hasRememberedEligibility;
}
