import { describe, expect, it } from "vitest";

import { weekSummaryToShow } from "./week-summary";

describe("weekSummaryToShow", () => {
  it("読み込み中は出さない", () => {
    expect(weekSummaryToShow({ status: "loading" })).toBeNull();
  });

  it("取得に失敗したら 0 回と出さない", () => {
    expect(weekSummaryToShow({ status: "failed" })).toBeNull();
  });

  it("取得できたら、0 回でもそのまま出す", () => {
    expect(weekSummaryToShow({ status: "ready", summary: { count: 0, days: 0 } })).toEqual({ count: 0, days: 0 });
  });
});
