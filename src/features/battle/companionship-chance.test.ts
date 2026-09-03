import { describe, expect, it } from "vitest";

import {
  COMPANIONSHIP_CHANCE_PER_MEAL_LOG,
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

  it("1件あたり25%で、上限件数で100%になる", () => {
    expect(COMPANIONSHIP_CHANCE_PER_MEAL_LOG).toBe(0.25);
    expect(COMPANIONSHIP_MEAL_LOG_CAP).toBe(4);
    expect(companionshipChance(1)).toBe(0.25);
    expect(companionshipChance(2)).toBe(0.5);
    expect(companionshipChance(3)).toBe(0.75);
    expect(companionshipChance(4)).toBe(1);
    expect(companionshipChance(5)).toBe(1);
  });

  it("画面表示用のパーセントは四捨五入する", () => {
    expect(companionshipChancePercent(0)).toBe(0);
    expect(companionshipChancePercent(1)).toBe(25);
    expect(companionshipChancePercent(4)).toBe(100);
  });
});
