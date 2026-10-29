import { describe, expect, it } from "vitest";

import { colors, fontSize } from "./tokens";

describe("design tokens", () => {
  it("子どもの画面の文字サイズは基準が 18、最小が 15", () => {
    expect(fontSize.childBase).toBe(18);
    expect(fontSize.childMin).toBe(15);
  });

  it("主要な色が DESIGN.md の値と一致する", () => {
    expect({
      sky: colors.sky,
      skySoft: colors.skySoft,
      leaf: colors.leaf,
      leafSoft: colors.leafSoft,
      sunset: colors.sunset,
      pink: colors.pink,
      pinkEdge: colors.pinkEdge,
      gold: colors.gold,
      goldEdge: colors.goldEdge,
      ink: colors.ink,
      inkSoft: colors.inkSoft,
      line: colors.line,
      paper: colors.paper,
      canvas: colors.canvas,
      bubbleFill: colors.bubbleFill,
    }).toEqual({
      sky: "#5ec4f2",
      skySoft: "#dff3fd",
      leaf: "#7fcf5a",
      leafSoft: "#e8f7dc",
      sunset: "#ff9a4d",
      pink: "#ff7aac",
      pinkEdge: "#d9578b",
      gold: "#f5b81c",
      goldEdge: "#c98d00",
      ink: "#2f3440",
      inkSoft: "#5f6675",
      line: "#e3e7ee",
      paper: "#ffffff",
      canvas: "#f6f8fb",
      bubbleFill: "#ffffff4d",
    });
  });
});
