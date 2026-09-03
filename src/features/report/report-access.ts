/**
 * サブスクリプション行から、いま分析を閲覧できるかを判定する。
 *
 * Stripe の status をそのまま持つDB側と違い、「どの status を有効とみなすか」は
 * アプリの決定なのでここに置く。DBの CHECK 制約に書くと、Stripe が status を
 * 増やしたとき Webhook の書き込みが失敗し、古い権利が黙って残る。
 */

/** 支払いが済んでいる、または試用中とみなす status。 */
const ENTITLED_STATUSES = new Set(["active", "trialing"]);

export type SubscriptionEntitlement = {
  status: string;
  current_period_end: string | null;
};

export function hasActiveEntitlement(
  subscription: SubscriptionEntitlement | null,
  now: Date,
): boolean {
  if (!subscription) return false;
  if (!ENTITLED_STATUSES.has(subscription.status)) return false;

  // 期限が未設定の行は権利ありとみなさない。Webhook が期間を書けなかった行を
  // 「無期限に有効」と読むと、失敗が課金の抜け穴になる。
  if (!subscription.current_period_end) return false;

  const periodEnd = new Date(subscription.current_period_end).getTime();
  if (Number.isNaN(periodEnd)) return false;

  return periodEnd > now.getTime();
}
