import { describe, expect, it } from "vitest";

import { groupMealLogsByDay, mealSlotOf } from "./meal-time";

const at = (hour: number, minute = 0) => new Date(2026, 9, 29, hour, minute);

describe("mealSlotOf", () => {
  it.each([
    [4, 0, "morning"],
    [10, 59, "morning"],
    [11, 0, "noon"],
    [15, 59, "noon"],
    [16, 0, "evening"],
    [23, 59, "evening"],
    [0, 0, "evening"],
    [3, 59, "evening"],
  ] as const)("%i時%i分は %s", (hour, minute, expected) => {
    expect(mealSlotOf(at(hour, minute))).toBe(expected);
  });

  it("ISO文字列でも端末ローカル時間で判定する", () => {
    expect(mealSlotOf(at(8).toISOString())).toBe("morning");
  });
});

describe("groupMealLogsByDay", () => {
  const now = at(12);
  const logAt = (daysAgo: number, id: string) => ({ id, eatenAt: new Date(2026, 9, 29 - daysAgo, 9).toISOString() });

  it("きょう・きのう・それより前に分け、順序を保つ", () => {
    const result = groupMealLogsByDay([logAt(0, "a"), logAt(0, "b"), logAt(1, "c"), logAt(5, "d")], now);
    expect(result.map((s) => [s.day, s.logs.map((l) => l.id)])).toEqual([
      ["today", ["a", "b"]],
      ["yesterday", ["c"]],
      ["earlier", ["d"]],
    ]);
  });

  it("空の区分は返さない", () => {
    expect(groupMealLogsByDay([logAt(1, "c")], now).map((s) => s.day)).toEqual(["yesterday"]);
    expect(groupMealLogsByDay([], now)).toEqual([]);
  });

  it("不正な日付は出さない", () => {
    expect(groupMealLogsByDay([{ id: "x", eatenAt: "not-a-date" }], now)).toEqual([]);
  });
});
