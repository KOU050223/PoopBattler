import { describe, expect, it } from "vitest";

import { weekdayLabel } from "./report-labels";

describe("weekdayLabel", () => {
  it("曜日の内部値を日本語ラベルへ変換する", () => {
    expect(weekdayLabel("thu")).toBe("木曜日");
    expect(weekdayLabel("mon")).toBe("月曜日");
  });
});
