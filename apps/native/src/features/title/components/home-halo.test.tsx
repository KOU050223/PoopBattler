import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", async () => (await import("@/design/kids/test-mocks")).nativeMock());
vi.mock("react-native-svg", () => ({ default: () => null, Ellipse: () => null }));

import { haloLayout } from "../home-layout";
import { HomeHalo } from "./home-halo";

describe("HomeHalo", () => {
  const element = HomeHalo({ windowWidth: 375, largeBubbleSize: 139 });

  it("タップを横取りしない", () => {
    expect(element.props.pointerEvents).toBe("none");
  });

  it("アクセシビリティから隠す", () => {
    expect(element.props.accessible).toBe(false);
    expect(element.props.importantForAccessibility).toBe("no-hide-descendants");
  });

  it("寸法は haloLayout の結果と一致する", () => {
    const { width, height } = haloLayout(375, 139);
    expect(element.props.style[1]).toMatchObject({ width, height });
  });
});
