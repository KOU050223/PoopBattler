import { describe, expect, it } from "vitest";

import { foodLabelKeys, MEAL_FOOD_TILES } from "./meal-food-tiles";

describe("MEAL_FOOD_TILES", () => {
  it("タイルと保存値が仕様どおり対応している", () => {
    expect(MEAL_FOOD_TILES.map((tile) => [tile.labelKey.replace("Gohan.food.", ""), tile.value])).toEqual([
      ["rice", "rice"],
      ["bread", "bread"],
      ["noodles", "noodles"],
      ["meat", "meat"],
      ["fish", "fish"],
      ["eggs", "eggs"],
      ["coloredVegetables", "green_yellow_vegetables"],
      ["whiteVegetables", "light_colored_vegetables"],
      ["fruit", "fruit"],
      ["milk", "milk"],
      ["sweets", "sweets"],
      ["other", "other"],
    ]);
  });

  it("アルコールとカフェインを出さない", () => {
    const values = MEAL_FOOD_TILES.map((tile) => tile.value as string);
    expect(values).not.toContain("alcohol");
    expect(values).not.toContain("caffeine");
  });

  it("保存値の重複がない", () => {
    expect(new Set(MEAL_FOOD_TILES.map((tile) => tile.value)).size).toBe(MEAL_FOOD_TILES.length);
  });
});

describe("foodLabelKeys", () => {
  it("タイルにある値だけを順に返す", () => {
    expect(foodLabelKeys(["eggs", "alcohol", "rice"])).toEqual(["Gohan.food.eggs", "Gohan.food.rice"]);
  });
});
