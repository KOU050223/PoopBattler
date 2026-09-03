import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

import { getServiceRoleEnvironment } from "./env";

// Stripe の Webhook が受け取った購読状態を subscriptions へ反映する。
// subscriptions は RLS 有効かつ書き込みポリシー不在なので、RLS をバイパスする
// サービスロールでしか書けない。Route Handler はデータアクセス境界の
// 許可リストに入っていないため、クライアントの生成はここへ閉じ込め、
// Route Handler には結果だけを返す（auth-callback.ts と同じ形）。

export type SubscriptionWriteResult =
  | { status: "ok" }
  | { status: "error"; reason: string };

export type SubscriptionRecord = {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: string;
  currentPeriodEnd: string | null;
};

/**
 * サービスロールのクライアントを作る。
 *
 * セッションを持たせない。Cookie を読み書きすると、リクエストの利用者の
 * セッションをサービスロールの権限で上書きしうる。
 */
function createServiceRoleClient() {
  const { url, serviceRoleKey } = getServiceRoleEnvironment();

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * 購読を1件書き込む。ユーザーにつき1行なので user_id で upsert する。
 *
 * Stripe のイベントは順序が保証されず再送もあるため、
 * 「作成か更新か」をアプリ側で判断せず、常に最新の状態で上書きする。
 */
export async function upsertSubscription(record: SubscriptionRecord): Promise<SubscriptionWriteResult> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("subscriptions")
    .upsert(
      {
        user_id: record.userId,
        stripe_customer_id: record.stripeCustomerId,
        stripe_subscription_id: record.stripeSubscriptionId,
        status: record.status,
        current_period_end: record.currentPeriodEnd,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (error) {
    return { status: "error", reason: error.code ?? "upsert_failed" };
  }

  return { status: "ok" };
}

/**
 * 既存の購読の状態だけを更新する。
 *
 * 顧客IDと購読IDの両方で絞る。顧客IDだけで絞ると、同じ顧客の古い購読に対して
 * 遅れて届いた deleted が、新しい有効な購読まで取り消してしまう。
 *
 * 対象の行が無い場合はエラーを返す。Stripe はイベントの順序を保証しないため、
 * Checkout より先に購読イベントが着くと更新対象がまだ存在しない。そこで 200 を
 * 返すと Stripe は再送せず、その更新は永久に失われる。エラーにして再送させる。
 */
export async function updateSubscriptionStatusByCustomer({
  stripeCustomerId,
  stripeSubscriptionId,
  status,
  currentPeriodEnd,
}: {
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: string;
  currentPeriodEnd: string | null;
}): Promise<SubscriptionWriteResult> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .update({ status, current_period_end: currentPeriodEnd, updated_at: new Date().toISOString() })
    .eq("stripe_customer_id", stripeCustomerId)
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .select("id");

  if (error) {
    return { status: "error", reason: error.code ?? "update_failed" };
  }

  if (!data || data.length === 0) {
    return { status: "error", reason: "subscription_not_found" };
  }

  return { status: "ok" };
}
