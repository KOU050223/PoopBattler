import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", async () => (await import("./test-mocks")).nativeMock());
vi.mock("react-native-reanimated", async () => (await import("./test-mocks")).reanimatedMock());
vi.mock("expo-haptics", async () => (await import("./test-mocks")).hapticsMock());
vi.mock("../fonts", () => ({ fontFamily: {} }));
vi.mock("@expo/vector-icons/Ionicons", async () => (await import("./test-mocks")).ioniconsMock());

import { SceneBackground } from "./scene-background";

describe("SceneBackground", () => {
  it("背景画像の上に子要素を描画する", () => {
    const html = renderToStaticMarkup(createElement(SceneBackground, { children: "ホーム" }));
    expect(html).toContain("<img");
    expect(html).toContain("ホーム");
  });
});
