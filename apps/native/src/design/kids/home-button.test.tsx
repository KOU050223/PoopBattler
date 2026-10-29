import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", async () => (await import("./test-mocks")).nativeMock());
vi.mock("react-native-reanimated", async () => (await import("./test-mocks")).reanimatedMock());
vi.mock("expo-haptics", async () => (await import("./test-mocks")).hapticsMock());
vi.mock("../fonts", () => ({ fontFamily: {} }));
vi.mock("@expo/vector-icons/Ionicons", async () => (await import("./test-mocks")).ioniconsMock());

import { pressableProps } from "./test-mocks";
import { HomeButton } from "./home-button";

describe("HomeButton", () => {
  it("家のアイコンを表示する", () => {
    expect(renderToStaticMarkup(createElement(HomeButton, { onPress: () => {} }))).toContain("home");
  });

  it("押すと onPress が呼ばれ、読み上げラベルがつく", () => {
    const onPress = vi.fn();
    renderToStaticMarkup(createElement(HomeButton, { onPress }));
    (pressableProps.current.onPress as () => void)();
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(pressableProps.current.accessibilityLabel).toBe("ホームにもどる");
  });
});
