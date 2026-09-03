import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../../../messages/ja.json";

import { WeeklyReportView } from "./weekly-report-view";
import type { WeeklyReport } from "../weekly-report";

const report: WeeklyReport = {
  range: { startsAt: "2026-08-30T15:00:00.000Z", endsAt: "2026-09-04T12:00:00.000Z" },
  summary: { bowelCount: 3, recordedDays: 2, countChangeFromPreviousWeek: 1, averageHardness: 4.5, stableRate: 67 },
  breakdown: {
    hardness: [0, 0, 0, 2, 1, 0, 0],
    amount: { small: 0, normal: 2, large: 1 },
    color: { brown: 3, dark_brown: 0, yellow: 0, green: 0 },
    ease: { easy: 2, normal: 1, hard: 0 },
  },
  meals: { total: 2, byTag: { vegetable: 2 } },
  mealRelationships: [{ tag: "vegetable", relatedBowelCount: 2, averageHardness: 4.5 }],
  analysis: {
    dailyCounts: [],
    weekdayCounts: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
    timeOfDayCounts: { morning: 0, afternoon: 0, evening: 0, night: 0 },
    fourWeekTrend: [],
    mealTagAnalyses: [],
  },
};

describe("WeeklyReportView", () => {
  // 権利の判定は actions.ts が済ませており、このコンポーネントは
  // 権利のある利用者にしか描かれない。表示の網羅だけを見る。
  it("今週の詳細レポートを表示する", () => {
    const markup = renderToStaticMarkup(
      <NextIntlClientProvider locale="ja" messages={messages}>
        <WeeklyReportView report={report} />
      </NextIntlClientProvider>,
    );

    expect(markup).toContain("今週のうんちレポート");
    expect(markup).toContain("硬さの分布");
    expect(markup).toContain("食事との記録上の関連");
    expect(markup).toContain("日別の記録");
    expect(markup).toContain("4週間の推移");
    expect(markup).toContain("食事タグ別の分析");
    expect(markup).toContain("野菜");
  });
});
