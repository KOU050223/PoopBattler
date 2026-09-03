import { describe, expect, it } from "vitest";

import {
  BOWEL_AMOUNT_OPTIONS,
  BOWEL_COLOR_OPTIONS,
  BOWEL_EASE_OPTIONS,
  BOWEL_HARDNESS_OPTIONS,
  isBowelLog,
} from "./bowel-log.types";

describe("bowel log options", () => {
  it("DB CHECK制約と同じ値だけを選択肢にする", () => {
    expect(BOWEL_HARDNESS_OPTIONS.map((option) => option.value)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(BOWEL_AMOUNT_OPTIONS.map((option) => option.value)).toEqual(["small", "normal", "large"]);
    expect(BOWEL_COLOR_OPTIONS.map((option) => option.value)).toEqual(["brown", "dark_brown", "yellow", "green"]);
    expect(BOWEL_EASE_OPTIONS.map((option) => option.value)).toEqual(["easy", "normal", "hard"]);
  });

  it("4項目が揃った正しい値だけを後続へ渡せる", () => {
    expect(isBowelLog({ hardness: 4, amount: "normal", color: "brown", ease: "easy" })).toBe(true);
    expect(isBowelLog({ hardness: 8, amount: "normal", color: "brown", ease: "easy" })).toBe(false);
    expect(isBowelLog({ hardness: 4, amount: "normal", color: "purple", ease: "easy" })).toBe(false);
    expect(isBowelLog({ hardness: 4, amount: "normal", color: "brown" })).toBe(false);
  });
});
