import { describe, expect, it } from "vitest";

import {
  COMPANIONSHIP_CHANCE_BY_COUNT,
  COMPANIONSHIP_MEAL_LOG_CAP,
  companionshipChance,
  companionshipChancePercent,
} from "./companionship-chance";

describe("companionshipChance", () => {
  it("食事ログが無いときは抽選しない", () => {
    expect(companionshipChance(0)).toBe(0);
    expect(companionshipChance(-1)).toBe(0);
    expect(companionshipChance(1.5)).toBe(0);
  });

  it("1件50%、2件75%、3件85%、4件以降90%になる", () => {
    expect(COMPANIONSHIP_CHANCE_BY_COUNT).toEqual([0.5, 0.75, 0.85, 0.9]);
    expect(COMPANIONSHIP_MEAL_LOG_CAP).toBe(4);
    expect(companionshipChance(1)).toBe(0.5);
    expect(companionshipChance(2)).toBe(0.75);
    expect(companionshipChance(3)).toBe(0.85);
    expect(companionshipChance(4)).toBe(0.9);
    expect(companionshipChance(5)).toBe(0.9);
  });

  it("画面表示用のパーセントは四捨五入する", () => {
    expect(companionshipChancePercent(0)).toBe(0);
    expect(companionshipChancePercent(1)).toBe(50);
    expect(companionshipChancePercent(2)).toBe(75);
    expect(companionshipChancePercent(3)).toBe(85);
    expect(companionshipChancePercent(4)).toBe(90);
  });
});
