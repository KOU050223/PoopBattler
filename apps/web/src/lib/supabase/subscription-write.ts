import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { IapSubscriptionRecord } from "@poopbattler/domain/billing/iap-event";
import type { SubscriptionRecord } from "@poopbattler/domain/billing/stripe-event";
import type { Database } from "@poopbattler/domain/types/database.types";

import { getServiceRoleEnvironment } from "./env";

// Stripe / RevenueCat の Webhook が受け取った購読状態を subscriptions へ反映する。
// subscriptions は RLS 有効かつ書き込みポリシー不在なので、RLS をバイパスする
// サービスロールでしか書けない。Route Handler はデータアクセス境界の
// 許可リストに入っていないため、クライアントの生成はここへ閉じ込め、
// Route Handler には結果だけを返す（auth-callback.ts と同じ形）。

export type SubscriptionWriteResult =
  | { status: "ok" }
  | { status: "error"; reason: string };

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
        provider: "stripe",
        stripe_customer_id: record.stripeCustomerId,
        stripe_subscription_id: record.stripeSubscriptionId,
        // 相手プロバイダのID列（apple_original_transaction_id）は消さない。
        // 消すと Apple 側に生きた購読が残る利用者の管理・解約導線が切れる。
        // 遅延イベントの誤突合は update 側の provider 条件で防ぐ。
        status: record.status,
        current_period_end: record.currentPeriodEnd,
        cancel_at_period_end: record.cancelAtPeriodEnd,
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
 * さらに last_event_at より古いイベントは無視する。Stripe は配信順を保証せず、
 * 到着順で無条件に上書きすると「解約済みの行を古い updated が active へ戻す」
 * ことが起きる。権利が復活したまま残るため、失敗として気づけない。
 *
 * 対象の行が無い場合はエラーを返す。Checkout より先に購読イベントが着くと
 * 更新対象がまだ存在しないため、200 を返すと Stripe は再送せず更新が失われる。
 */
export async function updateSubscriptionStatusByCustomer({
  stripeCustomerId,
  stripeSubscriptionId,
  status,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  eventCreatedAt,
}: {
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  eventCreatedAt: string;
}): Promise<SubscriptionWriteResult> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .update({
      status,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: cancelAtPeriodEnd,
      last_event_at: eventCreatedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_customer_id", stripeCustomerId)
    .eq("stripe_subscription_id", stripeSubscriptionId)
    // プロバイダ切替後の行へ旧プロバイダの遅延イベントが当たるのを防ぐ。
    // upsert は相手側のID列を保持するため、IDの一致だけでは絞れない。
    .eq("provider", "stripe")
    // last_event_at が未設定の行（この機能より前に書かれた行）は必ず受け入れる。
    .or(`last_event_at.is.null,last_event_at.lt.${eventCreatedAt}`)
    .select("id");

  if (error) {
    return { status: "error", reason: error.code ?? "update_failed" };
  }

  // 0行は2つの意味を持つ: 対象が無い（再送させたい）か、
  // より新しいイベントで既に更新済み（再送は無意味）か。
  // 後者を再送させると永久に失敗し続けるため、行の有無で切り分ける。
  if (!data || data.length === 0) {
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("stripe_customer_id", stripeCustomerId)
      .eq("stripe_subscription_id", stripeSubscriptionId)
      .maybeSingle();

    if (existing) {
      // 行はあるが更新されなかった＝より新しいイベントが先に適用済み。
      // 期待どおりの動作なので成功として返す。
      return { status: "ok" };
    }

    return { status: "error", reason: "subscription_not_found" };
  }

  return { status: "ok" };
}

/**
 * TRANSFER で権利が移った側（移転元）の購読行を消す。
 *
 * 移転後の新しい持ち主には別途 upsert 系のイベントが届くため、ここでは
 * 移転元の行だけを消す。行を残すと旧ユーザーに権利が残り続ける上、
 * 新しい持ち主の upsert が unique 制約に衝突して永久に再送される。
 *
 * 対象は移転元ユーザーの apple 行で、original_transaction_id が一致するもの。
 * 行が無くても成功とする（すでに移転済みか、取りこぼしは upsert 側の
 * 防御で処理される）。
 */
export async function deleteTransferredIapSubscription({
  appleOriginalTransactionId,
  fromUserIds,
}: {
  appleOriginalTransactionId: string;
  fromUserIds: string[];
}): Promise<SubscriptionWriteResult> {
  // 空の配列を .in() に渡すと不正なクエリになる。消せる行が無いので成功で終える。
  if (fromUserIds.length === 0) {
    return { status: "ok" };
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("subscriptions")
    .delete()
    .eq("provider", "apple")
    .eq("apple_original_transaction_id", appleOriginalTransactionId)
    .in("user_id", fromUserIds);

  if (error) {
    return { status: "error", reason: error.code ?? "delete_failed" };
  }

  return { status: "ok" };
}

/**
 * Apple（RevenueCat）の購読を1件書き込む。Stripe と同じく user_id で upsert する。
 *
 * last_event_at も書き込む。Stripe 側の upsert は書いていないが、IAP では
 * 購入イベント自体が発生時刻を持つため、後から届く古い状態遷移イベントに
 * 新しい購入を上書きされないよう入れておく。
 *
 * 順序制御: upsert 自身にも last_event_at のガードを入れる。EXPIRATION や
 * REFUND を適用済みの行へ、遅延した INITIAL_PURCHASE / RENEWAL が届くと
 * 権利が active に復活してしまう。既存行が apple で、同等以上に新しい
 * イベントを適用済みなら書かずに成功扱いで終える（再送は無意味）。
 * 既存行が stripe の場合はプロバイダの切替なので常に適用する。
 *
 * TRANSFER の取りこぼし対策もここで行う。権利が別ユーザーへ移ったあと、
 * 旧持ち主の行が同じ original_transaction_id を持ったまま残ると、
 * 新しい持ち主のこの upsert が unique 制約に衝突して永久に再送される。
 * 別ユーザーの行が同じIDを持っていたら先に消してから書く。
 */
export async function upsertIapSubscription(
  record: IapSubscriptionRecord,
): Promise<SubscriptionWriteResult> {
  const supabase = createServiceRoleClient();

  const { data: existing, error: lookupError } = await supabase
    .from("subscriptions")
    .select("provider, last_event_at")
    .eq("user_id", record.userId)
    .maybeSingle();

  if (lookupError) {
    return { status: "error", reason: lookupError.code ?? "lookup_failed" };
  }

  if (
    existing?.provider === "apple"
    && existing.last_event_at !== null
    // timestamptz の文字列表記は形式が揃わない（+00:00 / .000Z など）ため、
    // 文字列ではなく時刻として比較する。
    && new Date(existing.last_event_at).getTime() >= new Date(record.eventCreatedAt).getTime()
  ) {
    return { status: "ok" };
  }

  const { error: cleanupError } = await supabase
    .from("subscriptions")
    .delete()
    .eq("provider", "apple")
    .eq("apple_original_transaction_id", record.appleOriginalTransactionId)
    .neq("user_id", record.userId);

  if (cleanupError) {
    return { status: "error", reason: cleanupError.code ?? "delete_failed" };
  }

  const { error } = await supabase
    .from("subscriptions")
    .upsert(
      {
        user_id: record.userId,
        provider: "apple",
        apple_original_transaction_id: record.appleOriginalTransactionId,
        // 相手プロバイダのID列（stripe_customer_id / stripe_subscription_id）は
        // 消さない。Stripe 側に生きた購読が残る利用者のポータル・解約導線を
        // 維持するため。遅延イベントの誤突合は update 側の provider 条件で防ぐ。
        status: record.status,
        current_period_end: record.currentPeriodEnd,
        cancel_at_period_end: record.cancelAtPeriodEnd,
        last_event_at: record.eventCreatedAt,
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
 * Apple 購読の状態だけを更新する。original_transaction_id で既存行を突合する。
 *
 * 順序制御は Stripe 側と同じ: last_event_at より古いイベントは無視する。
 * RevenueCat も配信順を保証しないため、到着順で無条件に上書きすると
 * 「期限切れの行を古い RENEWAL が active へ戻す」ことが起きる。
 *
 * 対象の行が無い場合はエラーを返す。INITIAL_PURCHASE より先に
 * CANCELLATION 等が着くと更新対象がまだ存在しないため、200 を返すと
 * RevenueCat は再送せず更新が失われる。
 */
export async function updateIapSubscriptionByTransaction({
  appleOriginalTransactionId,
  status,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  eventCreatedAt,
}: {
  appleOriginalTransactionId: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  eventCreatedAt: string;
}): Promise<SubscriptionWriteResult> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .update({
      status,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: cancelAtPeriodEnd,
      last_event_at: eventCreatedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("apple_original_transaction_id", appleOriginalTransactionId)
    // プロバイダ切替後の行へ旧プロバイダの遅延イベントが当たるのを防ぐ。
    // upsert は相手側のID列を保持するため、IDの一致だけでは絞れない。
    .eq("provider", "apple")
    .or(`last_event_at.is.null,last_event_at.lt.${eventCreatedAt}`)
    .select("id");

  if (error) {
    return { status: "error", reason: error.code ?? "update_failed" };
  }

  // 0行は2つの意味を持つ: 対象が無い（再送させたい）か、
  // より新しいイベントで既に更新済み（再送は無意味）か。
  // 後者を再送させると永久に失敗し続けるため、行の有無で切り分ける。
  if (!data || data.length === 0) {
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("apple_original_transaction_id", appleOriginalTransactionId)
      .maybeSingle();

    if (existing) {
      // 行はあるが更新されなかった＝より新しいイベントが先に適用済み。
      return { status: "ok" };
    }

    return { status: "error", reason: "subscription_not_found" };
  }

  return { status: "ok" };
}
