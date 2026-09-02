import { describe, expect, it } from "vitest";

import { getMealAttribute, MEAL_TAGS } from "./meal.types";

describe("meal tags", () => {
  it("keeps every MVP tag mapped to the attribute used when feeding an enemy", () => {
    expect(MEAL_TAGS.map((tag) => tag.value)).toEqual([
      "curry",
      "vegetable",
      "banana",
      "dairy",
      "spicy",
      "other",
    ]);
    expect(getMealAttribute("curry")).toBe("curry");
    expect(getMealAttribute("banana")).toBe("sweet");
    expect(getMealAttribute("other")).toBe("normal");
  });
});
