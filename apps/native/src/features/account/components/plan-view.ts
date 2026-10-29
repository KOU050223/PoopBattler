import type { SubscriptionSnapshot } from "@/features/billing/subscription-status";

export type PlanView = {
  /** プラン名の行。unknown・読み込み中を「未登録」と誤表示しないため専用のキーを持つ。 */
  nameKey: string;
  /** 「プランを見る」（購入画面への導線）。変更前は not-subscribed のときだけ出していた。 */
  canViewPlan: boolean;
  body: "loading" | "subscribed" | "lapsed" | "not-subscribed" | "unknown";
};

export function planView(snapshot: SubscriptionSnapshot | null, loaded: boolean): PlanView {
  if (!loaded || snapshot === null) {
    return { nameKey: "Account.planLoading", canViewPlan: false, body: "loading" };
  }
  switch (snapshot.status) {
    case "subscribed":
      return { nameKey: "Account.planActive", canViewPlan: false, body: "subscribed" };
    case "lapsed":
      return { nameKey: "Account.planLapsed", canViewPlan: false, body: "lapsed" };
    case "not-subscribed":
      return { nameKey: "Account.planNone", canViewPlan: true, body: "not-subscribed" };
    default:
      return { nameKey: "Account.planUnknown", canViewPlan: false, body: "unknown" };
  }
}
