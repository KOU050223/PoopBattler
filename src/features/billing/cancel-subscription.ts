import Stripe from "stripe";

import { getStripeEnvironment } from "./stripe-env";

// 退会時の購読キャンセル。アカウント削除より先に呼ぶ。
// DBだけ消して Stripe 側に課金が残る状態を作らないための分界をここに置く。

/**
 * まだ請求を起こしうる status。これ以外（canceled / incomplete_expired）は
 * Stripe 側で終端なので、cancel を呼ばずに削除へ進んでよい。
 *
 * - incomplete: 初回請求の支払い待ち。放置すると支払いが通って active に
 *   なるため、キャンセル対象に含める。
 * - paused / unpaid / past_due: 再開・再請求がありうるため含める。
 */
const CANCELLABLE_STATUSES = new Set([
  "active",
  "trialing",
  "incomplete",
  "past_due",
  "unpaid",
  "paused",
]);

function isResourceMissing(error: unknown): boolean {
  return (
    typeof error === "object"
    && error !== null
    && (error as { code?: unknown }).code === "resource_missing"
  );
}

/**
 * 購読を即時キャンセルする。成功（またはキャンセル不要・対象なし）なら true。
 *
 * DB の status ではなく Stripe から取り直して判定する。Webhook の欠落や
 * 遅延で DB が古いままだと、「canceled と信じて削除したら Stripe 側は
 * active だった」になりうるため。
 *
 * 失敗で false を返した場合、呼び出し側はアカウント削除を中止する。
 * 「消えたかもしれない」のまま進むと課金だけが残る。
 */
export async function cancelSubscriptionNow(subscriptionId: string): Promise<boolean> {
  let stripe: Stripe;
  try {
    stripe = new Stripe(getStripeEnvironment().secretKey);
  } catch {
    return false;
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    if (CANCELLABLE_STATUSES.has(subscription.status)) {
      await stripe.subscriptions.cancel(subscriptionId);
    }
    return true;
  } catch (error) {
    // 購読そのものが無いなら課金の残りようがない（retrieve と cancel の
    // あいだに消える競合も同じコードで来るため、まとめて済扱いにする）。
    return isResourceMissing(error);
  }
}
