import { describe, expect, it } from "vitest";

import type { SubscriptionSnapshot } from "@/features/billing/subscription-status";

import { planView } from "./plan-view";

const snapshotOf = (status: SubscriptionSnapshot["status"]) => ({ status }) as SubscriptionSnapshot;

describe("planView", () => {
  it.each([
    ["not-subscribed", "Account.planNone", true],
    ["subscribed", "Account.planActive", false],
    ["lapsed", "Account.planLapsed", false],
    ["unknown", "Account.planUnknown", false],
  ] as const)("%s のプラン名と導線", (status, nameKey, canViewPlan) => {
    expect(planView(snapshotOf(status), true)).toEqual({ nameKey, canViewPlan, body: status });
  });

  it("読み込み中は未登録と出さず、導線も出さない", () => {
    expect(planView(null, false)).toEqual({ nameKey: "Account.planLoading", canViewPlan: false, body: "loading" });
  });

  it("loaded でも snapshot が無ければ読み込み中として扱う", () => {
    expect(planView(null, true).body).toBe("loading");
  });
});
