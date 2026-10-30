import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", async () => (await import("@/design/kids/test-mocks")).nativeMock());
vi.mock("@/design/fonts", () => ({ fontFamily: {} }));

import { AibouStatRow } from "./aibou-stat-row";

describe("AibouStatRow", () => {
  it("ラベルと実効値を並べて表示する", () => {
    const html = renderToStaticMarkup(
      createElement(AibouStatRow, { stats: [{ label: "たいりょく", value: 120 }, { label: "パワー", value: 45 }, { label: "わざ", value: 0 }] }),
    );
    expect(html).toContain("たいりょく");
    expect(html).toContain("120");
    expect(html).toContain("0");
  });
});
