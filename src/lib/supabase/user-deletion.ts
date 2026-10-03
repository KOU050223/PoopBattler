import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

import { getServiceRoleEnvironment } from "./env";

// アカウント削除時の auth.users 削除。削除すると profiles → meal_logs / battle_results /
// bowel_logs / user_characters、および subscriptions が FK の
// on delete cascade で同一トランザクション内に消える。
// 削除は auth.admin 経由でしか実行できないため、RLS をバイパスする
// サービスロールで行う（subscription-write.ts と同じ形）。

export type UserDeletionResult =
  | { status: "ok" }
  | { status: "error"; reason: string };

/**
 * ユーザーを1人だけ完全に削除する。
 *
 * セッションを持たせない。Cookie を読み書きすると、リクエストの利用者の
 * セッションをサービスロールの権限で上書きしうる。
 * 呼び出し側は「いまの利用者の id」だけを渡すこと。任意の id を受け付ける
 * 形にすると、権限の強いこの関数が第三者の削除に使われる経路になる。
 */
export async function deleteUserCompletely(userId: string): Promise<UserDeletionResult> {
  try {
    const { url, serviceRoleKey } = getServiceRoleEnvironment();
    const supabase = createSupabaseClient<Database>(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) {
      return { status: "error", reason: error.code ?? "delete_failed" };
    }

    return { status: "ok" };
  } catch {
    return { status: "error", reason: "unexpected" };
  }
}
