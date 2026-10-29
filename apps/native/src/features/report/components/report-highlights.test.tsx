import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { describe, expect, it, vi } from "vitest";

import { createWeeklyReport } from "@poopbattler/domain/report/weekly-report";
import { reportEn, reportJa } from "@/i18n/report";
import ja from "../../../../../web/messages/ja.json";
import en from "../../../../../web/messages/en.json";

const translation = createInstance();
await translation.init({
  resources: {
    ja: { translation: { Report: { ...ja.Report, ...reportJa } } },
    en: { translation: { Report: { ...en.Report, ...reportEn } } },
  },
  lng: "ja",
  interpolation: { prefix: "{", suffix: "}", escapeValue: false },
});

// Exercise component output; native layout still requires device verification.
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: translation.t.bind(translation) }) }));
vi.mock("react-native", async () => (await import("@/design/kids/test-mocks")).nativeMock());
vi.mock("@/design/fonts", () => ({ fontFamily: {} }));
vi.mock("@expo/vector-icons/Ionicons", async () => (await import("@/design/kids/test-mocks")).ioniconsMock());
vi.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

import { ReportComparison, ReportStats } from "./report-highlights";
import { WeeklyReportView } from "./weekly-report-view";

const now = "2026-10-09T00:00:00Z";
const log = (loggedAt: string, hardness = 4, ease: "easy" | "normal" | "hard" = "easy") => ({ loggedAt, hardness, ease, amount: "normal" as const, color: "brown" as const });
const report = (bowelLogs: ReturnType<typeof log>[]) => createWeeklyReport({ now, bowelLogs, mealLogs: [] });
const renderStats = (logs: ReturnType<typeof log>[]) => renderToStaticMarkup(createElement(ReportStats, { report: report(logs) }));
const renderComparison = (logs: ReturnType<typeof log>[]) => renderToStaticMarkup(createElement(ReportComparison, { report: report(logs) }));

describe("ReportStats", () => {
  it("回数・形が整っていた割合・すっきりした割合を出す", async () => {
    await translation.changeLanguage("ja");
    const html = renderStats([log("2026-10-06T00:00:00Z"), log("2026-10-07T00:00:00Z", 5, "hard")]);
    expect(html).toContain("2回");
    expect(html).toContain("50%");
    expect(html).toContain("すっきりした");
  });

  it("記録が無いときは 0回 と — を出し、0% は出さない", () => {
    const html = renderStats([]);
    expect(html).toContain("0回");
    expect(html).toContain("—");
    expect(html).not.toContain("0%");
  });
});

describe("ReportComparison", () => {
  it("今週と過去4週間を並べ、サンプル数の注記を出す", () => {
    const html = renderComparison([log("2026-10-06T00:00:00Z"), log("2026-10-07T00:00:00Z", 5, "hard"), log("2026-09-28T00:00:00Z", 1, "normal")]);
    expect(html).toContain("過去4週間");
    expect(html).toContain("週あたりの回数");
    expect(html).toContain("0.3回");
    expect(html).toContain("今週 2件・過去4週間 1件");
    expect(html).not.toContain(reportJa.baselineEmpty);
  });

  it("過去4週間が空のとき 0% ではなく — で、理由を出す", () => {
    const html = renderComparison([log("2026-10-06T00:00:00Z", 5, "hard")]);
    expect(html).toContain(reportJa.baselineEmpty);
    expect(html).toContain("—");
    expect(html).toContain(">0%</span>");
    expect(html).not.toContain(reportJa.currentEmpty);
  });

  it("今週が空でも過去の値は残る", () => {
    const html = renderComparison([log("2026-09-28T00:00:00Z")]);
    expect(html).toContain(reportJa.currentEmpty);
    expect(html).not.toContain(reportJa.baselineEmpty);
    expect(html).toContain("100%");
  });

  it("英語の文言でも未解決のキーが残らない", async () => {
    await translation.changeLanguage("en");
    const html = renderComparison([log("2026-10-06T00:00:00Z"), log("2026-09-28T00:00:00Z")]);
    expect(html).toContain(reportEn.baselinePeriod);
    expect(html).not.toContain("{count}");
    expect(html).not.toContain("Report.");
    await translation.changeLanguage("ja");
  });
});

describe("WeeklyReportView", () => {
  it("作らない節（今週のまとめ・いつもと違った点・とってみよう）を出さない", () => {
    const html = renderToStaticMarkup(createElement(WeeklyReportView, { report: report([log("2026-10-06T00:00:00Z")]) }));
    expect(html).toContain("毎日の回数");
    expect(html).toContain("食事との関係");
    expect(html).not.toContain("今週のまとめ");
    expect(html).not.toContain("いつもと違った点");
    expect(html).not.toContain("とってみよう");
  });

  it("記録も食事も無いとき、空のグラフの代わりに説明を出す", () => {
    const html = renderToStaticMarkup(createElement(WeeklyReportView, { report: report([]) }));
    expect(html).toContain(reportJa.dailyEmpty);
    expect(html).toContain(reportJa.mealEmpty);
  });
});
