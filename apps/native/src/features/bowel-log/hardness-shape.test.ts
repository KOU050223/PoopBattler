import { describe, expect, it } from "vitest";

import { toBowelShape } from "./hardness-shape";

describe("toBowelShape", () => {
  it.each([
    [1, "hard"],
    [2, "hard"],
    [3, "normal"],
    [4, "normal"],
    [5, "soft"],
    [7, "soft"],
  ] as const)("hardness %i は %s になる", (hardness, shape) => {
    expect(toBowelShape(hardness)).toBe(shape);
  });
});
