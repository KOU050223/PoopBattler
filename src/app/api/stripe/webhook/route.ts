import Stripe from "stripe";

import { getStripeWebhookSecret } from "@/features/billing/stripe-env";
import { resolveStripeEvent } from "@/features/billing/stripe-event";
import { updateSubscriptionStatusByCustomer, upsertSubscription } from "@/lib/supabase/subscription-write";

// Stripe の Webhook 受け口。
//
// この Route Handler はデータアクセス境界の許可リストに入っていないため、
// Supabase クライアントは生成しない。書き込みは lib/supabase/subscription-write.ts
// が閉じて持ち、ここは「署名検証 → イベントの解釈 → 書き込みの呼び出し」だけを行う
// （app/auth/callback/route.ts と同じ形）。

/**
 * 署名検証には body を1バイトも変えずに渡す必要がある。
 * Route Handler では `request.text()` がそのまま生の本文を返し、
 * Pages Router のような bodyParser の無効化設定は要らない。
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  let webhookSecret: string;
  let secretKey: string;
  try {
    webhookSecret = getStripeWebhookSecret();
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("missing key");
    secretKey = key;
  } catch {
    // 設定漏れを 400 で返すと Stripe が再送しない。500 にして再送させる。
    return new Response("Stripe is not configured", { status: 500 });
  }

  const payload = await request.text();

  const stripe = new Stripe(secretKey);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);
  } catch {
    // 署名が合わない要求は、こちらの不具合ではないので再送させない。
    return new Response("Invalid signature", { status: 400 });
  }

  // Checkout 完了は購読の期間を持たないため、ここで購読そのものを取りに行く。
  // 期限が null のまま書くと hasActiveEntitlement が権利なしと判定し、
  // 支払った直後の利用者が締め出される。後続イベント頼みにはできない
  // （Stripe はイベントの順序を保証しない）。
  let expandedSubscription: Stripe.Subscription | null = null;
  if (
    event.type === "checkout.session.completed"
    || event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    const subscriptionId =
      typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

    // 未払いのセッションは resolveStripeEvent 側で無視されるため、
    // ここで購読を取りに行く必要もない。
    if (subscriptionId && session.payment_status !== "unpaid") {
      try {
        expandedSubscription = await stripe.subscriptions.retrieve(subscriptionId);
      } catch {
        // 取得に失敗したまま進めると、期限が null の行を書いて 200 を返すことになる。
        // その行は hasActiveEntitlement が権利なしと判定するため、支払った利用者が
        // 締め出されたまま復旧の当てが無い（次の更新は更新期まで来ない）。
        // 500 を返して Stripe に再送させる。
        return new Response("Failed to retrieve subscription", { status: 500 });
      }
    }
  }

  const outcome = resolveStripeEvent(event, expandedSubscription);

  if (outcome.kind === "ignore") {
    return new Response("Ignored", { status: 200 });
  }

  if (outcome.kind === "invalid") {
    // 購読のイベントなのに必要な ID が無い。こちらの設定ミスなので、
    // 200 で握り潰さず Stripe のダッシュボードに失敗として残す。
    return new Response(`Unprocessable event: ${outcome.reason}`, { status: 422 });
  }

  const result = outcome.kind === "upsert"
    ? await upsertSubscription(outcome.record)
    : await updateSubscriptionStatusByCustomer({
        stripeCustomerId: outcome.stripeCustomerId,
        stripeSubscriptionId: outcome.stripeSubscriptionId,
        status: outcome.status,
        currentPeriodEnd: outcome.currentPeriodEnd,
        eventCreatedAt: outcome.eventCreatedAt,
      });

  if (result.status === "error") {
    // 書き込みに失敗したまま 200 を返すと、権利が付かないのに
    // Stripe 側は成功扱いで再送しない。500 で再送させる。
    return new Response(`Failed to persist subscription: ${result.reason}`, { status: 500 });
  }

  return new Response("Success", { status: 200 });
}
