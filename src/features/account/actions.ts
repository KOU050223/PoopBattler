"use server";

import { cancelSubscriptionNow } from "@/features/billing/cancel-subscription";
import { createClient } from "@/lib/supabase/server";
import { deleteUserCompletely } from "@/lib/supabase/user-deletion";

import {
  SIGNED_OUT_ACCOUNT_STATUS,
  toAccountStatus,
  type AccountStatus,
} from "./account.types";

/**
 * 現在のユーザーが匿名のままか、Google と連携済みかを返す。
 * 昇格の導線を出すかどうかと、データ消失の警告を出すかどうかがこれで決まる。
 */
export async function getAccountStatusAction(): Promise<AccountStatus> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) return SIGNED_OUT_ACCOUNT_STATUS;

  return toAccountStatus(user);
}

export type DeleteAccountResult =
  | { status: "deleted" }
  | { status: "error"; message: string };

const DELETE_ACCOUNT_ERROR_MESSAGE =
  "退会処理を完了できませんでした。時間をおいてもう一度お試しください。";

/**
 * 退会。いまの利用者のアカウントと、それに紐づく全データを削除する。
 *
 * 順序が重要で、Stripe の購読キャンセルを auth.users の削除より先に行う。
 * 先にユーザーを消すと、キャンセルに失敗したとき「DBは消えたのに課金だけ
 * 残る」取り返しのつかない状態になる。逆順なら失敗時に残るのは
 * 「購読が止まったアカウント」で、利用者はそのまま再試行できる。
 *
 * auth.users の削除は FK の on delete cascade で profiles /
 * meal_logs / battle_results / bowel_logs / user_characters /
 * subscriptions を同一トランザクション内に消すため、
 * DB側に「一部だけ消えた」状態は残らない（scripts/sql/rls-verify.sql で検証）。
 */
export async function deleteAccountAction(): Promise<DeleteAccountResult> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { status: "error", message: "ログイン状態を確認できませんでした。もう一度お試しください。" };
  }

  // 購読の有無を本人の行で確認する。SELECT ポリシーにより他人の行は読めない。
  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (subscriptionError) {
    return { status: "error", message: DELETE_ACCOUNT_ERROR_MESSAGE };
  }

  if (subscription?.stripe_subscription_id) {
    const cancelled = await cancelSubscriptionNow(subscription.stripe_subscription_id);
    if (!cancelled) {
      return { status: "error", message: DELETE_ACCOUNT_ERROR_MESSAGE };
    }
  }

  const deletion = await deleteUserCompletely(user.id);
  if (deletion.status === "error") {
    return { status: "error", message: DELETE_ACCOUNT_ERROR_MESSAGE };
  }

  // 削除済みのセッションをサーバー側でも閉じておく。ブラウザ側の signOut が
  // 失敗しても、ここで Cookie が消えれば stale なセッションは残らない。
  await supabase.auth.signOut().catch(() => {});

  return { status: "deleted" };
}
