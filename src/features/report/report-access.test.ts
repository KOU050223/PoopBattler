import { describe, expect, it } from "vitest";

import { isReportPreviewEnabled } from "./report-access";

describe("isReportPreviewEnabled", () => {
  it("開発環境では決済未接続でも分析画面を確認できる", () => {
    expect(isReportPreviewEnabled("development")).toBe(true);
  });

  it("本番・テスト環境ではプレミアム権利なしに分析を開かない", () => {
    expect(isReportPreviewEnabled("production")).toBe(false);
    expect(isReportPreviewEnabled("test")).toBe(false);
  });
});
