import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", async () => (await import("./test-mocks")).nativeMock());
vi.mock("react-native-reanimated", async () => (await import("./test-mocks")).reanimatedMock());
vi.mock("expo-haptics", async () => (await import("./test-mocks")).hapticsMock());
vi.mock("../fonts", () => ({ fontFamily: {} }));
vi.mock("@expo/vector-icons/Ionicons", async () => (await import("./test-mocks")).ioniconsMock());

import { pressableProps } from "./test-mocks";
import { SideTab } from "./side-tab";

describe("SideTab", () => {
  it("ラベルと値を表示する", () => {
    const html = renderToStaticMarkup(createElement(SideTab, { label: "れんぞく", value: "3にち" }));
    expect(html).toContain("れんぞく");
    expect(html).toContain("3にち");
  });

  it("押せる要素を描画しない", () => {
    pressableProps.current = {};
    const html = renderToStaticMarkup(createElement(SideTab, { label: "れんぞく" }));
    expect(html).not.toContain("<button");
    expect(pressableProps.current).toEqual({});
  });

  // onPress を渡せないことを型で保証する。
  it("onPress を props に受け取らない", () => {
    // @ts-expect-error SideTab は表示専用
    createElement(SideTab, { label: "れんぞく", onPress: () => {} });
  });
});
