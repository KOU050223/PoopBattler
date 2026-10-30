import { describe, expect, it } from "vitest";

import { countThisWeek } from "./week-count";

// 2026-10-29 は木曜。今週は 10-26（月）から。
const now = new Date(2026, 9, 29, 12, 0);

describe("countThisWeek", () => {
  it("今週の月曜 0:00 ちょうどの記録を数える", () => {
    expect(countThisWeek([new Date(2026, 9, 26, 0, 0)], now)).toBe(1);
  });

  it("先週の日曜の記録は数えない", () => {
    expect(countThisWeek([new Date(2026, 9, 25, 23, 59)], now)).toBe(0);
  });

  it("日曜に見たときは月曜から数える", () => {
    const sunday = new Date(2026, 10, 1, 9, 0);
    expect(countThisWeek([new Date(2026, 9, 26, 8, 0), new Date(2026, 9, 25, 8, 0)], sunday)).toBe(1);
  });

  it("未来の日時と不正な日時は数えない", () => {
    expect(countThisWeek([new Date(2026, 9, 30), "not-a-date"], now)).toBe(0);
  });

  it("空なら 0", () => {
    expect(countThisWeek([], now)).toBe(0);
  });

  it("同じ日に複数あれば回数として数える", () => {
    expect(countThisWeek([new Date(2026, 9, 28, 7), new Date(2026, 9, 28, 20)], now)).toBe(2);
  });
});
