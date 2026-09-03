import { describe, expect, it } from "vitest";

import {
  COMPANIONSHIP_CHANCE_PER_PHOTO,
  COMPANIONSHIP_PHOTO_CAP,
  companionshipChance,
  companionshipChancePercent,
} from "./companionship-chance";

describe("companionshipChance", () => {
  it("写真が無いときは抽選しない", () => {
    expect(companionshipChance(0)).toBe(0);
    expect(companionshipChance(-1)).toBe(0);
    expect(companionshipChance(1.5)).toBe(0);
  });

  it("1枚あたり25%で、上限枚数で100%になる", () => {
    expect(COMPANIONSHIP_CHANCE_PER_PHOTO).toBe(0.25);
    expect(COMPANIONSHIP_PHOTO_CAP).toBe(4);
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
