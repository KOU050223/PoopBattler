import { describe, expect, it } from "vitest";

import { ratioFromPosition, stepIndexFromPosition, stepRatio } from "./step-slider";

describe("stepIndexFromPosition", () => {
  it("左端は先頭、右端は末尾", () => {
    expect(stepIndexFromPosition(0, 300, 7)).toBe(0);
    expect(stepIndexFromPosition(300, 300, 7)).toBe(6);
  });

  it("中央は中間の段階", () => {
    expect(stepIndexFromPosition(150, 300, 7)).toBe(3);
  });

  it("トラック外へはみ出しても範囲内に収める", () => {
    expect(stepIndexFromPosition(-40, 300, 7)).toBe(0);
    expect(stepIndexFromPosition(999, 300, 7)).toBe(6);
  });

  it("幅0や段階1つでも例外にならない", () => {
    expect(stepIndexFromPosition(10, 0, 7)).toBe(0);
    expect(stepIndexFromPosition(10, 300, 1)).toBe(0);
  });
});

describe("stepRatio", () => {
  it("先頭0・末尾1", () => {
    expect(stepRatio(0, 7)).toBe(0);
    expect(stepRatio(6, 7)).toBe(1);
  });
});

describe("ratioFromPosition", () => {
  it("段階に丸めず連続値を返し、範囲外は0〜1に収める", () => {
    expect(ratioFromPosition(75, 300)).toBe(0.25);
    expect(ratioFromPosition(-5, 300)).toBe(0);
    expect(ratioFromPosition(400, 300)).toBe(1);
    expect(ratioFromPosition(10, 0)).toBe(0);
  });
});
