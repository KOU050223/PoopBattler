import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";

vi.mock("./manage-subscription-link", () => ({
  ManageSubscriptionLink: () => <span>subscription link</span>,
}));

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
  meals: { total: 2, byFoodGroup: { green_yellow_vegetables: 2 } },
  mealRelationships: [{ foodGroup: "green_yellow_vegetables", relatedBowelCount: 2, averageHardness: 4.5 }],
  analysis: {
    dailyCounts: [
      { date: "2026-08-31", count: 1 },
      { date: "2026-09-01", count: 0 },
      { date: "2026-09-02", count: 2 },
      { date: "2026-09-03", count: 0 },
      { date: "2026-09-04", count: 0 },
    ],
    weekdayCounts: { mon: 1, tue: 0, wed: 2, thu: 0, fri: 0, sat: 0, sun: 0 },
    timeOfDayCounts: { morning: 2, afternoon: 0, evening: 1, night: 0 },
    fourWeekTrend: [
      { weekStartsAt: "2026-08-09T15:00:00.000Z", bowelCount: 5, averageHardness: 4 },
      { weekStartsAt: "2026-08-16T15:00:00.000Z", bowelCount: 2, averageHardness: 3 },
      { weekStartsAt: "2026-08-23T15:00:00.000Z", bowelCount: 7, averageHardness: 4.2 },
      { weekStartsAt: "2026-08-30T15:00:00.000Z", bowelCount: 3, averageHardness: 4.5 },
    ],
    mealFoodGroupAnalyses: [
      {
        foodGroup: "green_yellow_vegetables",
        mealCount: 6,
        relatedWithin24Hours: 3,
        relatedWithin48Hours: 5,
        averageHardnessWithin24Hours: 4.3,
        averageHardnessWithin48Hours: 4.1,
      },
    ],
  },
};

/** 週の途中や記録0件でも図が壊れないことを見るための、すべて空のレポート。 */
const emptyReport: WeeklyReport = {
  range: report.range,
  summary: { bowelCount: 0, recordedDays: 0, countChangeFromPreviousWeek: 0, averageHardness: null, stableRate: null },
  breakdown: {
    hardness: [0, 0, 0, 0, 0, 0, 0],
    amount: { small: 0, normal: 0, large: 0 },
    color: { brown: 0, dark_brown: 0, yellow: 0, green: 0 },
    ease: { easy: 0, normal: 0, hard: 0 },
  },
  meals: { total: 0, byFoodGroup: {} },
  mealRelationships: [],
  analysis: {
    dailyCounts: [],
    weekdayCounts: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
    timeOfDayCounts: { morning: 0, afternoon: 0, evening: 0, night: 0 },
    fourWeekTrend: [],
    mealFoodGroupAnalyses: [],
  },
};

function render(value: WeeklyReport) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="ja" messages={messages}>
      <WeeklyReportView report={value} />
    </NextIntlClientProvider>,
  );
}

describe("WeeklyReportView", () => {
  // 権利の判定は actions.ts が済ませており、このコンポーネントは
  // 権利のある利用者にしか描かれない。表示の網羅だけを見る。
  it("今週の詳細レポートを表示する", () => {
    const markup = render(report);

    expect(markup).toContain("今週のうんちレポート");
    expect(markup).toContain("硬さの分布");
    expect(markup).toContain("食事との記録上の関連");
    expect(markup).toContain("日別の記録");
    expect(markup).toContain("4週間の推移");
    expect(markup).toContain("食品群別の分析");
    expect(markup).toContain("緑黄色野菜");
    expect(markup).toContain("色の内訳");
    expect(markup).toContain("時間帯");
  });

  // 数値は図ではなくDOMのテキストとして置く。SVGだけにすると
  // 読み上げから値が消え、ぼかしの見本も成立しなくなる。
  it("図に描いた値をテキストとしても持つ", () => {
    const markup = render(report);

    // 色の内訳は集計されているのに、これまでどこにも描かれていなかった。
    expect(markup).toContain("茶色");
    expect(markup).toContain("こげ茶");
    // 夜と深夜を1つに丸めず、4区分のまま出す。
    expect(markup).toContain("夕方");
    expect(markup).toContain("もっとも記録が多い曜日: 水曜日");
    // 4週推移の折れ線。点の座標が計算できていれば polyline が出る。
    expect(markup).toContain("<polyline");
    expect(markup).toContain("24時間内");
    expect(markup).toContain("48時間内");
  });

  // 全部0の週は、どの図も最大値0で割ることになる。
  // 棒が消えるのではなく NaN で壊れる経路なので、必ず一緒に見る。
  it("記録が0件でも図が壊れず「記録なし」を出す", () => {
    const markup = render(emptyReport);

    expect(markup).toContain("記録なし");
    expect(markup).not.toContain("NaN");
    // 0件の週に折れ線を引くと 0 除算になるため、線自体を描かない。
    expect(markup).not.toContain("<polyline");
    // 節そのものは残す。図が出せないだけで、見出しまで消してはいけない。
    expect(markup).toContain("硬さの分布");
    expect(markup).toContain("4週間の推移");
  });
});
