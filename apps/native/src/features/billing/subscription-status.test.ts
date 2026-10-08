import { describe, expect, it } from "vitest";

import { toSubscriptionSnapshot } from "./subscription-status";

const NOW = new Date("2026-10-09T00:00:00Z");

describe("toSubscriptionSnapshot", () => {
  it("行が無ければ not-subscribed", () => {
    expect(toSubscriptionSnapshot(null, NOW)).toEqual({ status: "not-subscribed" });
  });

  it("active かつ期限内は subscribed。provider と解約予約を保持する", () => {
    expect(
      toSubscriptionSnapshot(
        { status: "active", current_period_end: "2026-11-01T00:00:00Z", cancel_at_period_end: false, provider: "apple" },
        NOW,
      ),
    ).toEqual({ status: "subscribed", provider: "apple", cancelAtPeriodEnd: false, periodEnd: "2026-11-01T00:00:00Z" });
  });

  it("行があっても期限切れ・権利外statusは lapsed", () => {
    expect(
      toSubscriptionSnapshot(
        { status: "active", current_period_end: "2026-10-01T00:00:00Z", cancel_at_period_end: false, provider: "apple" },
        NOW,
      ),
    ).toEqual({ status: "lapsed", provider: "apple" });
    expect(
      toSubscriptionSnapshot(
        { status: "billing_issue", current_period_end: "2026-11-01T00:00:00Z", cancel_at_period_end: false, provider: "apple" },
        NOW,
      ),
    ).toEqual({ status: "lapsed", provider: "apple" });
    // 期限が未設定の行は権利なし（webhook が期間を書けなかった行を無期限にしない）
    expect(
      toSubscriptionSnapshot(
        { status: "active", current_period_end: null, cancel_at_period_end: false, provider: "apple" },
        NOW,
      ),
    ).toEqual({ status: "lapsed", provider: "apple" });
  });

  it("trialing も権利あり", () => {
    expect(
      toSubscriptionSnapshot(
        { status: "trialing", current_period_end: "2026-11-01T00:00:00Z", cancel_at_period_end: false, provider: "apple" },
        NOW,
      ).status,
    ).toBe("subscribed");
  });
});
