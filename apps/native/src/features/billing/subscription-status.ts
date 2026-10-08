import { hasActiveEntitlement } from "@poopbattler/domain/report/report-access";

// apps/web/src/features/billing/actions.ts の SubscriptionSnapshot に
// provider を足したもの。native 側の購読は Apple 管理なので、
// 表示側が「App Store で管理」を出せるよう保持する。

export type SubscriptionRow = {
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  provider: string;
};

export type SubscriptionSnapshot =
  | {
      status: "subscribed";
      provider: string;
      /** 期間末解約の予約済みか。解約後も期間末までは権利が残る。 */
      cancelAtPeriodEnd: boolean;
      periodEnd: string | null;
    }
  /** 行はあるが権利が無い（支払い失敗・期限切れ）。課金案内ではなく支払いの修正が必要。 */
  | { status: "lapsed"; provider: string }
  | { status: "not-subscribed" }
  /** 読み取り失敗や未サインイン。「未購読」と誤表示しないため別状態。 */
  | { status: "unknown" };

export function toSubscriptionSnapshot(
  row: SubscriptionRow | null,
  now: Date,
): Exclude<SubscriptionSnapshot, { status: "unknown" }> {
  if (!row) return { status: "not-subscribed" };
  if (!hasActiveEntitlement(row, now)) {
    return { status: "lapsed", provider: row.provider };
  }
  return {
    status: "subscribed",
    provider: row.provider,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    periodEnd: row.current_period_end,
  };
}
