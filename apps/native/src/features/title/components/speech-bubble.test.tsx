import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", async () => (await import("@/design/kids/test-mocks")).nativeMock());
vi.mock("@/design", () => ({
  colors: {},
  fontFamily: {},
  fontSize: {},
  radius: {},
  spacing: {},
}));

import { SpeechBubble } from "./speech-bubble";

describe("SpeechBubble", () => {
  it("props の message をそのまま表示する", () => {
    const html = renderToStaticMarkup(createElement(SpeechBubble, { message: "きょうも ここで まってたブリ" }));
    expect(html).toContain("きょうも ここで まってたブリ");
  });

  it("message を差し替えると表示も変わる", () => {
    const html = renderToStaticMarkup(createElement(SpeechBubble, { message: "おなかへったブリ" }));
    expect(html).toContain("おなかへったブリ");
    expect(html).not.toContain("きょうも");
  });
});
