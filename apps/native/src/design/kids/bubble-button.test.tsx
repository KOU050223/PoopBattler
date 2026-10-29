import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", async () => (await import("./test-mocks")).nativeMock());
vi.mock("react-native-reanimated", async () => (await import("./test-mocks")).reanimatedMock());
vi.mock("expo-haptics", async () => (await import("./test-mocks")).hapticsMock());
vi.mock("../fonts", () => ({ fontFamily: {} }));
vi.mock("@expo/vector-icons/Ionicons", async () => (await import("./test-mocks")).ioniconsMock());

import { pressableProps } from "./test-mocks";
import { BubbleButton } from "./bubble-button";

describe("BubbleButton", () => {
  it("ラベルを表示する（large / small どちらも）", () => {
    expect(renderToStaticMarkup(createElement(BubbleButton, { label: "うんちする", variant: "large", onPress: () => {} }))).toContain("うんちする");
    expect(renderToStaticMarkup(createElement(BubbleButton, { label: "ごはん", onPress: () => {} }))).toContain("ごはん");
  });

  it("押すと onPress が呼ばれる", () => {
    const onPress = vi.fn();
    renderToStaticMarkup(createElement(BubbleButton, { label: "ごはん", onPress }));
    (pressableProps.current.onPress as () => void)();
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
