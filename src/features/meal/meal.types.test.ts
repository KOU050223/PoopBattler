import { describe, expect, it } from "vitest";

import { getMealFoodGroupLabel, isMealFoodGroup, MEAL_FOOD_GROUP_OPTIONS } from "./meal.types";

describe("meal food groups", () => {
  it("offers analysis-ready vegetable choices and rejects unknown IDs", () => {
    expect(MEAL_FOOD_GROUP_OPTIONS.map((group) => group.value)).toContain("green_yellow_vegetables");
    expect(MEAL_FOOD_GROUP_OPTIONS.map((group) => group.value)).toContain("light_colored_vegetables");
    expect(MEAL_FOOD_GROUP_OPTIONS.map((group) => group.value)).toContain("mushrooms");
    expect(MEAL_FOOD_GROUP_OPTIONS.map((group) => group.value)).toContain("seaweed");
    expect(isMealFoodGroup("fish")).toBe(true);
    expect(isMealFoodGroup("not-a-food-group")).toBe(false);
    expect(getMealFoodGroupLabel("green_yellow_vegetables")).toBe("緑黄色野菜");
  });
});
