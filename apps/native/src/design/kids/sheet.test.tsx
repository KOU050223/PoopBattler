import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", async () => (await import("./test-mocks")).nativeMock());
vi.mock("react-native-reanimated", async () => (await import("./test-mocks")).reanimatedMock());
vi.mock("expo-haptics", async () => (await import("./test-mocks")).hapticsMock());
vi.mock("../fonts", () => ({ fontFamily: {} }));
vi.mock("@expo/vector-icons/Ionicons", async () => (await import("./test-mocks")).ioniconsMock());

import { Sheet } from "./sheet";

describe("Sheet", () => {
  it("visible のとき中身を表示する", () => {
    expect(renderToStaticMarkup(createElement(Sheet, { visible: true, onClose: () => {}, children: "パーツ" }))).toContain("パーツ");
  });

  it("visible が false のとき中身を出さない", () => {
    expect(renderToStaticMarkup(createElement(Sheet, { visible: false, onClose: () => {}, children: "パーツ" }))).not.toContain("パーツ");
  });
});
