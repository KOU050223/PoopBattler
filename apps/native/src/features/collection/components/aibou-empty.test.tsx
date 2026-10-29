import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", async () => (await import("@/design/kids/test-mocks")).nativeMock());
vi.mock("react-native-reanimated", async () => (await import("@/design/kids/test-mocks")).reanimatedMock());
vi.mock("expo-haptics", async () => (await import("@/design/kids/test-mocks")).hapticsMock());
vi.mock("@/design/fonts", () => ({ fontFamily: {} }));
vi.mock("@expo/vector-icons/Ionicons", async () => (await import("@/design/kids/test-mocks")).ioniconsMock());

import { AibouEmpty } from "./aibou-empty";

const render = (props: { hint?: string; isError?: boolean }) =>
  renderToStaticMarkup(createElement(AibouEmpty, { title: "まだ いないよ", actionLabel: "ホームへ", onAction: () => {}, ...props }));

// モックの View は div になる。外側 wrapper > 白い板 > 中身 の入れ子で、板の中に出ていることを見る。
const PANEL_OPEN = /^<div><div>/;

describe("AibouEmpty", () => {
  it("文言とボタンが白い板の中に出る", () => {
    const html = render({ hint: "うんちを すると ふえるよ" });
    expect(html).toMatch(PANEL_OPEN);
    const panel = html.slice("<div><div>".length, html.lastIndexOf("</div></div>"));
    expect(panel).toContain("まだ いないよ");
    expect(panel).toContain("うんちを すると ふえるよ");
    expect(panel).toContain("ホームへ");
  });

  it("hint が無いときは説明文を出さずボタンは残す", () => {
    const html = render({});
    expect(html).toContain("ホームへ");
    expect(html).not.toContain("うんちを");
  });
});
