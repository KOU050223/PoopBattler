import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", async () => (await import("../kids/test-mocks")).nativeMock());
vi.mock("../fonts", () => ({ fontFamily: {} }));
vi.mock("@expo/vector-icons/Ionicons", async () => (await import("../kids/test-mocks")).ioniconsMock());

import { pressableProps } from "../kids/test-mocks";
import { MenuRow } from "./MenuRow";
import { NoticeCard } from "./NoticeCard";
import { ParentButton } from "./ParentButton";

describe("ParentButton", () => {
  it("押すと onPress が呼ばれ、ラベルが出る", () => {
    const onPress = vi.fn();
    const html = renderToStaticMarkup(createElement(ParentButton, { label: "購入する", variant: "primary", onPress }));
    (pressableProps.current.onPress as () => void)();
    expect(html).toContain("購入する");
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("disabled のときは読み上げ状態に反映される", () => {
    renderToStaticMarkup(createElement(ParentButton, { label: "購入する", onPress: () => {}, disabled: true }));
    expect(pressableProps.current.accessibilityState).toEqual({ disabled: true });
  });
});

describe("MenuRow", () => {
  it("説明とバッジを渡すと一緒に表示される", () => {
    const html = renderToStaticMarkup(
      createElement(MenuRow, { icon: "bar-chart-outline", label: "週間レポート", description: "今週の様子", badge: "プレミアム", onPress: () => {} }),
    );
    expect(html).toEqual(expect.stringContaining("週間レポート"));
    expect(html).toEqual(expect.stringContaining("今週の様子"));
    expect(html).toEqual(expect.stringContaining("プレミアム"));
  });

  it("説明とバッジを渡さないときは出ない", () => {
    const html = renderToStaticMarkup(createElement(MenuRow, { icon: "person-outline", label: "アカウント", onPress: () => {} }));
    expect(html).not.toContain("プレミアム");
  });
});

describe("NoticeCard", () => {
  it("タイトルと本文を表示する", () => {
    const html = renderToStaticMarkup(createElement(NoticeCard, { tone: "warn", title: "注意" }, "本文"));
    expect(html).toEqual(expect.stringContaining("注意"));
    expect(html).toEqual(expect.stringContaining("本文"));
  });
});
