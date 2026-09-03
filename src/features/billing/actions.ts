"use server";

import Stripe from "stripe";

import { toAccountStatus } from "@/features/account/account.types";
import { hasActiveEntitlement } from "@/features/report/report-access";
import { createClient } from "@/lib/supabase/server";

import { getStripeEnvironment } from "./stripe-env";

// レポート分析の購入と、購入後の管理（解約・支払い方法の変更）。
//
// Google連携の必須化はここで強制する。ペイウォールのUIだけで制御すると、
// 細工した呼び出しで匿名アカウントに権利が付き、端末を変えた時点で
// 復元できない購入になる（docs/architecture.md L255）。

export type CheckoutResult =
  | { status: "redirecting"; url: string }
  /** サインインしていない、または匿名のまま。連携を促す。 */
  | { status: "link-required"; message: string }
  /** すでに購読中。二重課金を防ぐ。 */
  | { status: "already-subscribed"; message: string }
  | { status: "error"; message: string };

const LINK_REQUIRED_MESSAGE =
  "購入にはGoogleアカウントの連携が必要です。連携しないと、"
  + "端末を変えたときに購入した権利を復元できません。";

const UNKNOWN_ERROR_MESSAGE = "決済ページを開けませんでした。時間をおいて試してください。";

const ALREADY_SUBSCRIBED_MESSAGE = "すでにプレミアムをご利用中です。";

function createStripeClient() {
  const { secretKey } = getStripeEnvironment();
  return new Stripe(secretKey);
}

/**
 * 購入用の Checkout セッションを作る。
 *
 * 匿名ユーザーとGoogle未連携ユーザーはここで拒否する。UI側の分岐は
 * 案内のためのもので、権利の境界はこの関数が持つ。
 */
export async function createCheckoutSessionAction(): Promise<CheckoutResult> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { status: "link-required", message: LINK_REQUIRED_MESSAGE };
  }

  const account = toAccountStatus(user);
  if (account.isAnonymous || !account.hasGoogleIdentity) {
    return { status: "link-required", message: LINK_REQUIRED_MESSAGE };
  }

  // すでに権利があるなら決済ページを作らない。作ると2つ目の定期購読ができ、
  // 二重に請求される。Stripe 側は「別の購読」として正常に処理してしまうため、
  // ここで止めるしかない。
  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  if (subscriptionError) {
    return { status: "error", message: UNKNOWN_ERROR_MESSAGE };
  }

  if (hasActiveEntitlement(subscription, new Date())) {
    return { status: "already-subscribed", message: ALREADY_SUBSCRIBED_MESSAGE };
  }

  let environment;
  try {
    environment = getStripeEnvironment();
  } catch {
    return { status: "error", message: UNKNOWN_ERROR_MESSAGE };
  }

  try {
    const session = await createStripeClient().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: environment.priceId, quantity: 1 }],
      // Stripe と Supabase の対応付けは ID で行う。メールは Google 側で
      // 変更されうるため照合キーにしない。metadata にも入れ、
      // Checkout 由来でない購読イベントからも辿れるようにする。
      client_reference_id: user.id,
      subscription_data: { metadata: { supabase_user_id: user.id } },
      customer_email: account.email ?? undefined,
      success_url: `${environment.appUrl}/report?purchase=success`,
      cancel_url: `${environment.appUrl}/report?purchase=canceled`,
    });

    if (!session.url) {
      return { status: "error", message: UNKNOWN_ERROR_MESSAGE };
    }

    return { status: "redirecting", url: session.url };
  } catch {
    return { status: "error", message: UNKNOWN_ERROR_MESSAGE };
  }
}

/**
 * 解約・支払い方法の変更のため、Stripe の顧客ポータルを開く。
 *
 * 顧客IDは自分の subscriptions 行から引く。RLS により本人の行しか読めないため、
 * 他人のポータルは開けない。
 */
export async function createBillingPortalSessionAction(): Promise<CheckoutResult> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { status: "link-required", message: LINK_REQUIRED_MESSAGE };
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (subscriptionError || !subscription) {
    return { status: "error", message: "購読の情報が見つかりませんでした。" };
  }

  let environment;
  try {
    environment = getStripeEnvironment();
  } catch {
    return { status: "error", message: UNKNOWN_ERROR_MESSAGE };
  }

  try {
    const session = await createStripeClient().billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${environment.appUrl}/report`,
    });

    return { status: "redirecting", url: session.url };
  } catch {
    return { status: "error", message: UNKNOWN_ERROR_MESSAGE };
  }
}
