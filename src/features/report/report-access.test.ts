import { describe, expect, it } from "vitest";

import { hasActiveEntitlement } from "./report-access";

const now = new Date("2026-09-04T00:00:00.000Z");
const future = "2026-10-01T00:00:00.000Z";
const past = "2026-08-01T00:00:00.000Z";

describe("hasActiveEntitlement", () => {
  it("有効な期間内の active な購読では分析を開ける", () => {
    expect(hasActiveEntitlement({ status: "active", current_period_end: future }, now)).toBe(true);
  });

  it("試用中も分析を開ける", () => {
    expect(hasActiveEntitlement({ status: "trialing", current_period_end: future }, now)).toBe(true);
  });

  it("購読が無いユーザーは分析を開けない", () => {
    expect(hasActiveEntitlement(null, now)).toBe(false);
  });

  it("期間が切れた購読では分析を開けない", () => {
    expect(hasActiveEntitlement({ status: "active", current_period_end: past }, now)).toBe(false);
  });

  it("解約済み・支払い遅延の購読では分析を開けない", () => {
    expect(hasActiveEntitlement({ status: "canceled", current_period_end: future }, now)).toBe(false);
    expect(hasActiveEntitlement({ status: "past_due", current_period_end: future }, now)).toBe(false);
    expect(hasActiveEntitlement({ status: "incomplete", current_period_end: future }, now)).toBe(false);
  });

  // Webhook が期間を書けなかった行を「無期限に有効」と読むと、
  // 書き込み失敗がそのまま課金の抜け穴になる。
  it("期限が未設定の行は権利ありとみなさない", () => {
    expect(hasActiveEntitlement({ status: "active", current_period_end: null }, now)).toBe(false);
  });

  it("期限が壊れた値の行は権利ありとみなさない", () => {
    expect(hasActiveEntitlement({ status: "active", current_period_end: "not-a-date" }, now)).toBe(false);
  });
});
