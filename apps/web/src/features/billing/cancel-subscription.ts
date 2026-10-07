import Stripe from "stripe";

import { getStripeSecretKey } from "./stripe-env";

// アカウント削除時の課金停止。auth.users の削除より先に呼ぶ。
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

function createStripe(): Stripe {
  return new Stripe(getStripeSecretKey());
}

async function cancelIfNeeded(
  stripe: Stripe,
  subscription: { id: string; status: string },
): Promise<void> {
  if (!CANCELLABLE_STATUSES.has(subscription.status)) return;
  await stripe.subscriptions.cancel(subscription.id);
}

/**
 * 購読1件を終端にする。成功（またはキャンセル不要・対象なし）なら true。
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
    stripe = createStripe();
  } catch {
    return false;
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await cancelIfNeeded(stripe, subscription);
    return true;
  } catch (error) {
    // 購読そのものが無いなら課金の残りようがない（retrieve と cancel の
    // あいだに消える競合も同じコードで来るため、まとめて済扱いにする）。
    return isResourceMissing(error);
  }
}

/**
 * 課金停止の結果。
 * - closed: Stripe 側に課金の残る経路がないことを確認できた
 * - unconfigured: Stripe の鍵が無い。この環境では Checkout も購読も
 *   作りえないため、DB に購読行が無いユーザーならそのまま削除してよい。
 *   行があるなら課金を確認できないので中止すべき。
 * - failed: Stripe へ届いたが失敗した。課金が残っているか分からないため中止。
 */
export type CloseBillingResult = "closed" | "unconfigured" | "failed";

/**
 * アカウント削除の前に、そのユーザーの Stripe 側の課金経路をすべて閉じる。
 *
 * - 支払い途中で残っている Checkout セッションを expire する。
 *   消し忘れると、削除後に決済が完了して「アカウントの無い購読」ができる。
 *   （セッションは client_reference_id に auth.users.id を入れて作る）
 * - 見つかる限りの顧客・購読をキャンセルする。DB の subscriptions 行は
 *   Webhook が書いた時点の記録なので、行が無くても Stripe 側に購読が
 *   存在しうる（Webhook 欠落・2回目の購入など）。メールで顧客を引いて
 *   網羅する側と、DB の行に記録されたIDを直接使う側の両方で拾う。
 *
 * 「どこかで1回失敗した」だけで failed を返し、呼び出し側は削除を中止する。
 * expire と決済完了が競合して購読ができてしまう残りの隙間は、Webhook が
 * FK違反を検出して購読を止める経路（api/stripe/webhook）で塞ぐ。
 */
export async function closeUserBilling({
  userId,
  email,
  stripeCustomerId,
  stripeSubscriptionId,
}: {
  userId: string;
  email: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}): Promise<CloseBillingResult> {
  let stripe: Stripe;
  try {
    stripe = createStripe();
  } catch {
    return "unconfigured";
  }

  try {
    // 開いたままの Checkout を無効化する。支払い完了後は customer が
    // 付くため、client_reference_id（ユーザーID）での照合に加えて
    // 顧客IDでも拾う。
    for await (const session of stripe.checkout.sessions.list({ status: "open", limit: 100 })) {
      const ownedByUser = session.client_reference_id === userId;
      const ownedByCustomer =
        stripeCustomerId !== null
        && (typeof session.customer === "string"
          ? session.customer === stripeCustomerId
          : session.customer?.id === stripeCustomerId);

      if (ownedByUser || ownedByCustomer) {
        await stripe.checkout.sessions.expire(session.id);
      }
    }

    // 購読の拾い方は2系統。DBの顧客IDと、メールで引いた顧客の両方から
    // 購読を列挙し、終端でないものを止める。
    const customerIds = new Set<string>();
    if (stripeCustomerId) customerIds.add(stripeCustomerId);
    if (email) {
      for await (const customer of stripe.customers.list({ email, limit: 100 })) {
        customerIds.add(customer.id);
      }
    }

    const canceled = new Set<string>();
    for (const customerId of customerIds) {
      for await (const subscription of stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 100,
      })) {
        if (canceled.has(subscription.id)) continue;
        await cancelIfNeeded(stripe, subscription);
        canceled.add(subscription.id);
      }
    }

    // 顧客の列挙で拾えなかった分（DBにだけ記録がある購読ID）の保険。
    if (stripeSubscriptionId && !canceled.has(stripeSubscriptionId)) {
      try {
        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        await cancelIfNeeded(stripe, subscription);
      } catch (error) {
        if (!isResourceMissing(error)) throw error;
      }
    }

    return "closed";
  } catch (error) {
    // failed は「課金が残っているか分からない」で削除を中止する重い失敗。
    // どの呼び出しで落ちたか分からないと再現できないため、サーバー側の
    // ログにだけ残す（利用者へは actions 側が汎用文を返す）。
    console.error("[closeUserBilling] failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return "failed";
  }
}
