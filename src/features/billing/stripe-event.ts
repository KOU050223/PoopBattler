import type Stripe from "stripe";

import type { SubscriptionRecord } from "@/lib/supabase/subscription-write";

/**
 * Stripe のイベントから、subscriptions へ書き込む内容を組み立てる。
 *
 * Route Handler から切り離した純粋関数にしてある。Stripe のイベントは
 * 形が入り組んでいて取り違えやすく、「通ったのに間違った行を書いた」が
 * 一番起きやすい場所なので、テストで固定できる形にしておく。
 */

export type StripeEventOutcome =
  | { kind: "upsert"; record: SubscriptionRecord }
  | {
      kind: "update-by-customer";
      stripeCustomerId: string;
      stripeSubscriptionId: string;
      status: string;
      currentPeriodEnd: string | null;
      /** このイベントの発生時刻。これより新しい行は上書きしない。 */
      eventCreatedAt: string;
    }
  /** 購読に関係しないイベント。200 を返して受け取りだけ済ませる。 */
  | { kind: "ignore" }
  /** 購読のイベントだが必要な情報が欠けている。設定ミスとして扱う。 */
  | { kind: "invalid"; reason: string };

function toIsoOrNull(seconds: number | null | undefined): string | null {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000).toISOString();
}

function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

/**
 * 定期購読の期間終了時刻を取り出す。
 *
 * Stripe API の新しいバージョンでは `current_period_end` が Subscription の
 * 直下ではなく items[].current_period_end に移っているため、両方を見る。
 * 片方だけを読むと、APIバージョン次第で期限が null のまま書かれ、
 * hasActiveEntitlement が「権利なし」と判定して課金済みの人が締め出される。
 */
export function periodEndOf(subscription: Stripe.Subscription): string | null {
  const direct = toIsoOrNull(
    (subscription as unknown as { current_period_end?: number }).current_period_end,
  );
  if (direct) return direct;

  const ends =
    subscription.items?.data
      ?.map((item) =>
        toIsoOrNull((item as unknown as { current_period_end?: number }).current_period_end),
      )
      .filter((value): value is string => value !== null) ?? [];

  if (ends.length === 0) return null;

  // 複数の item があれば、権利が続く最後の時刻を採る。
  return ends.reduce((latest, value) => (value > latest ? value : latest));
}

export function resolveStripeEvent(
  event: Stripe.Event,
  /**
   * checkout.session.completed のときに、Route Handler が Stripe から
   * 取得しておいた購読。期限を1イベントで確定させるために使う。
   */
  expandedSubscription?: Stripe.Subscription | null,
): StripeEventOutcome {
  // 支払いが確定した Checkout。遅延通知型の支払い方法（コンビニ払い等）では
  // completed が payment_status: "unpaid" のまま先に届き、実際の成否は
  // async_payment_succeeded / async_payment_failed で後から知らされる。
  // completed だけで権利を付けると、後で失敗する支払いに権利を与え、
  // かつ後から成功したものには権利を与えないことになる。
  if (
    event.type === "checkout.session.completed"
    || event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;

    // 未払いのまま届いた completed では権利を付けない。
    // 後続の async_payment_succeeded を待つ（失敗すればそれも届かない）。
    if (session.payment_status === "unpaid") {
      return { kind: "ignore" };
    }

    // 購入者の対応付けはメールではなく ID で行う。
    // client_reference_id は Checkout 作成時にこちらが入れた auth.users.id。
    const userId = session.client_reference_id;
    const stripeCustomerId = idOf(session.customer);
    const stripeSubscriptionId = idOf(session.subscription);

    if (!userId || !stripeCustomerId || !stripeSubscriptionId) {
      return { kind: "invalid", reason: "checkout_session_missing_ids" };
    }

    // Checkout のセッション自体は購読の期間を持たない。しかし期限が null の行は
    // hasActiveEntitlement が「権利なし」と判定するため、ここで期限を埋められないと
    // 支払った直後の利用者が締め出される。
    //
    // 「直後に届く customer.subscription.updated が埋める」には頼れない。
    // Stripe はイベントの順序を保証せず、購読イベントが先に着くと更新対象の行が
    // まだ無く、その更新は行方不明になる。
    //
    // そこで Route Handler 側で購読を取得し、expandedSubscription として渡す。
    // 取得できなかった場合に限り null になる。
    return {
      kind: "upsert",
      record: {
        userId,
        stripeCustomerId,
        stripeSubscriptionId,
        status: expandedSubscription?.status ?? "active",
        currentPeriodEnd: expandedSubscription ? periodEndOf(expandedSubscription) : null,
      },
    };
  }

  // 遅延通知型の支払いが失敗した。completed の時点で権利を付けていないため、
  // 取り消すべき行は無い。受け取りだけ済ませる。
  if (event.type === "checkout.session.async_payment_failed") {
    return { kind: "ignore" };
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const stripeCustomerId = idOf(subscription.customer);

    if (!stripeCustomerId) {
      return { kind: "invalid", reason: "subscription_missing_customer" };
    }

    return {
      kind: "update-by-customer",
      stripeCustomerId,
      // 購読IDでも絞る。同じ顧客の古い購読に対する遅れて届いた deleted が、
      // 新しい有効な購読を取り消してしまうのを防ぐ。
      stripeSubscriptionId: subscription.id,
      // deleted でも Stripe は status を送ってくるが、取りこぼしたときに
      // 「有効なまま」へ倒さないよう canceled を明示する。
      status: event.type === "customer.subscription.deleted" ? "canceled" : subscription.status,
      currentPeriodEnd: periodEndOf(subscription),
      // Stripe は配信順を保証しないため、到着順ではなく発生順を正とする。
      eventCreatedAt: new Date(event.created * 1000).toISOString(),
    };
  }

  return { kind: "ignore" };
}
