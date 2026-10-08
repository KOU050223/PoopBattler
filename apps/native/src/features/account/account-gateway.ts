import type { SupabaseClient } from "@supabase/supabase-js";

import {
  SIGNED_OUT_ACCOUNT_STATUS,
  toAccountStatus,
  type AccountStatus,
} from "@poopbattler/domain/account/account.types";

import {
  toSubscriptionSnapshot,
  type SubscriptionSnapshot,
} from "@/features/billing/subscription-status";

// apps/web/src/features/account/actions.ts + billing/actions.ts の読み取り側。
// 書き込み系（削除・解約）は native にはサーバー経路が無いため持たない。
export function createAccountGateway(supabase: SupabaseClient) {
  return {
    /** 匿名のままか、Google と連携済みか。未サインインは signedOut の形で返す。 */
    async getAccountStatus(): Promise<AccountStatus> {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) return SIGNED_OUT_ACCOUNT_STATUS;
      return toAccountStatus(data.user);
    },

    /**
     * 購読状態。読み取り失敗を「未購読」と誤表示しないよう unknown を返す。
     * provider は Apple 管理の案内を出し分けるために読む。
     */
    async getSubscriptionSnapshot(): Promise<SubscriptionSnapshot> {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return { status: "unknown" };

      const { data, error } = await supabase
        .from("subscriptions")
        .select("status, current_period_end, cancel_at_period_end, provider")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) return { status: "unknown" };
      return toSubscriptionSnapshot(data, new Date());
    },
  };
}
