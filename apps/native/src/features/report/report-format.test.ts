import { describe, expect, it } from "vitest";

import { formatJstMonthDay, jstWeekdayIndex } from "./report-format";

describe("formatJstMonthDay", () => {
  it("UTC 深夜でも JST 側の日付で出す", () => {
    expect(formatJstMonthDay("2026-10-04T15:00:00Z")).toBe("10/5"); // JST 10/5 00:00
    expect(formatJstMonthDay("2026-10-04T14:59:59Z")).toBe("10/4");
  });
});

describe("jstWeekdayIndex", () => {
  it("月曜=0, 日曜=6", () => {
    expect(jstWeekdayIndex("2026-10-05")).toBe(0); // 月
    expect(jstWeekdayIndex("2026-10-11")).toBe(6); // 日
  });
});
