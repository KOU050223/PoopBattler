import { describe, expect, it } from "vitest";

import {
  BOWEL_AMOUNT_OPTIONS,
  BOWEL_COLOR_OPTIONS,
  BOWEL_EASE_OPTIONS,
  BOWEL_HARDNESS_OPTIONS,
  BOWEL_SYMPTOM_OPTIONS,
  getBowelHardnessGroup,
  isBowelLog,
} from "./bowel-log.types";

describe("bowel log options", () => {
  it("DB CHECK制約と同じ値だけを選択肢にする", () => {
    expect(BOWEL_HARDNESS_OPTIONS.map((option) => option.value)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(BOWEL_AMOUNT_OPTIONS.map((option) => option.value)).toEqual(["small", "normal", "large"]);
    expect(BOWEL_COLOR_OPTIONS.map((option) => option.value)).toEqual(["brown", "dark_brown", "yellow", "green", "red", "black", "white_gray", "other"]);
    expect(BOWEL_EASE_OPTIONS.map((option) => option.value)).toEqual(["easy", "normal", "hard"]);
    expect(BOWEL_SYMPTOM_OPTIONS.map((option) => option.value)).toEqual(["strained", "incomplete_evacuation", "abdominal_pain", "urgent_urge"]);
  });

  it("4項目が揃った正しい値だけを後続へ渡せる", () => {
    expect(isBowelLog({ hardness: 4, amount: "normal", color: "brown", ease: "easy" })).toBe(true);
    expect(isBowelLog({ hardness: 8, amount: "normal", color: "brown", ease: "easy" })).toBe(false);
    expect(isBowelLog({ hardness: 4, amount: "normal", color: "purple", ease: "easy" })).toBe(false);
    expect(isBowelLog({ hardness: 4, amount: "normal", color: "brown" })).toBe(false);
  });

  it("任意症状は空・未指定でも受け入れ、未知値や重複は拒否する", () => {
    const base = { hardness: 4, amount: "normal", color: "red", ease: "easy" } as const;

    expect(isBowelLog(base)).toBe(true);
    expect(isBowelLog({ ...base, symptoms: [] })).toBe(true);
    expect(isBowelLog({ ...base, symptoms: ["abdominal_pain", "urgent_urge"] })).toBe(true);
    expect(isBowelLog({ ...base, symptoms: ["unknown"] })).toBe(false);
    expect(isBowelLog({ ...base, symptoms: ["strained", "strained"] })).toBe(false);
  });

  it("レポート用の便形状区分は 1〜2 / 3〜4 / 5〜7 を漏れなく分ける", () => {
    expect([1, 2].map(getBowelHardnessGroup)).toEqual(["hard", "hard"]);
    expect([3, 4].map(getBowelHardnessGroup)).toEqual(["well_formed", "well_formed"]);
    expect([5, 6, 7].map(getBowelHardnessGroup)).toEqual(["soft", "soft", "soft"]);
  });
});
