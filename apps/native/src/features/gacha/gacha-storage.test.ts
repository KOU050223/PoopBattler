import { describe, expect, it } from "vitest";

import { EMPTY_GACHA_STATE } from "./gacha-state";
import { parseGachaState } from "./gacha-storage";

describe("parseGachaState", () => {
  it("正しい値はそのまま読める", () => {
    const state = { stones: 4, lastClaimedDay: 20000, heads: ["hat-a"], poopms: ["golden-poop"] };
    expect(parseGachaState(state)).toEqual(state);
  });

  it("オブジェクトでなければ空の状態", () => {
    expect(parseGachaState("x")).toEqual(EMPTY_GACHA_STATE);
    expect(parseGachaState(null)).toEqual(EMPTY_GACHA_STATE);
  });

  it("負の石・小数の石は0にする", () => {
    expect(parseGachaState({ stones: -3 }).stones).toBe(0);
    expect(parseGachaState({ stones: 1.5 }).stones).toBe(0);
  });

  it("未知のIDと重複は捨てる", () => {
    const state = parseGachaState({ heads: ["hat-a", "hat-a", "nope", "none"], poopms: ["bogus", "meat-poop"] });
    expect(state.heads).toEqual(["hat-a"]);
    expect(state.poopms).toEqual(["meat-poop"]);
  });
});
