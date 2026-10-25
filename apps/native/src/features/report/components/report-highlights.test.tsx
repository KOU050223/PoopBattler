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
vi.mock("react-native", () => ({
  View: ({ children }: { children: ReactNode }) => createElement("div", null, children),
  Text: ({ children }: { children: ReactNode }) => createElement("span", null, children),
  StyleSheet: { create: (value: unknown) => value, hairlineWidth: 1 },
}));
vi.mock("@/components/ui", () => ({ cardStyle: {} }));

import { ReportHighlights } from "./report-highlights";

const now = "2026-10-09T00:00:00Z";
const log = (loggedAt: string, hardness = 4, ease: "easy" | "normal" | "hard" = "easy") => ({ loggedAt, hardness, ease, amount: "normal" as const, color: "brown" as const });
const render = (bowelLogs: ReturnType<typeof log>[]) => renderToStaticMarkup(createElement(ReportHighlights, { report: createWeeklyReport({ now, bowelLogs, mealLogs: [] }) }));

describe("ReportHighlights", () => {
  it("shows four highlights and compares shared metrics without the old hardness headline", async () => {
    await translation.changeLanguage("ja");
    const html = render([log("2026-10-06T00:00:00Z"), log("2026-10-07T00:00:00Z", 5, "hard"), log("2026-09-28T00:00:00Z", 1, "normal")]);
    expect(html).toContain("今週のハイライト");
    expect(html).toContain("すっきりした割合");
    expect(html).toContain("Type 3〜4の割合");
    expect(html).toContain("50%");
    expect(html).toContain("Type 1〜2の割合");
    expect(html).toContain("Type 5〜7の割合");
    expect(html).toContain("出にくかった割合");
    expect(html).toContain("週平均 0.3回");
    expect(html).toContain("今週 2件・過去4週間 1件");
    expect(html).not.toContain("平均硬さ");
    expect(html).not.toContain(reportJa.baselineEmpty);
    expect(html).not.toContain(reportJa.currentEmpty);
  });

  it("distinguishes an absent baseline from a real zero percent", () => {
    const html = render([log("2026-10-06T00:00:00Z", 5, "hard")]);
    expect(html).toContain(reportJa.baselineEmpty);
    expect(html).toContain("—");
    expect(html).toContain(">0%</span>");
    expect(html).not.toContain("週平均 0回");
    expect(html).not.toContain(reportJa.currentEmpty);
  });

  it("keeps zero counts but leaves percentages unavailable with no records", () => {
    const html = render([]);
    expect(html).toContain("0回");
    expect(html).toContain("0日");
    expect(html).toContain(reportJa.currentEmpty);
    expect(html).toContain(reportJa.baselineEmpty);
    expect(html).not.toContain("0%");
  });

  it("preserves historical values when this week is empty", () => {
    const html = render([log("2026-09-28T00:00:00Z")]);
    expect(html).toContain(reportJa.currentEmpty);
    expect(html).not.toContain(reportJa.baselineEmpty);
    expect(html).toContain("100%");
  });

  it("renders English copy with interpolated counts", async () => {
    await translation.changeLanguage("en");
    const html = render([log("2026-10-06T00:00:00Z"), log("2026-09-28T00:00:00Z")]);
    expect(html).toContain(reportEn.comparisonTitle);
    expect(html).toContain("Weekly average: 0.3");
    expect(html).not.toContain("{count}");
    expect(html).not.toContain("Report.");
    await translation.changeLanguage("ja");
  });
});
