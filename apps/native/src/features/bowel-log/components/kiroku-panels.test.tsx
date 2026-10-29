import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// 共通モックの View は props を捨てるため、読み上げラベルを検証できるよう差し替える。
vi.mock("react-native", async () => ({
  ...(await import("@/design/kids/test-mocks")).nativeMock(),
  View: ({ children, accessibilityLabel }: { children?: ReactNode; accessibilityLabel?: string }) =>
    createElement("div", { "aria-label": accessibilityLabel }, children),
}));
vi.mock("@/design/fonts", () => ({ fontFamily: {} }));

import { MonthCalendar } from "./month-calendar";
import { RecentLogsPanel } from "./recent-logs-panel";

const weekdays = ["にち", "げつ", "か", "すい", "もく", "きん", "ど"];

describe("MonthCalendar", () => {
  const html = renderToStaticMarkup(
    createElement(MonthCalendar, {
      year: 2026, monthIndex: 9, title: "10がつ", weekdays, loggedDays: new Set([3]), today: 28, stampedLabel: "きろくあり",
    }),
  );

  it("月のタイトルと曜日を出す", () => {
    expect(html).toContain("10がつ");
    expect(html).toContain("げつ");
  });

  it("記録のある日にだけスタンプの読み上げラベルがつく", () => {
    expect(html).toContain('aria-label="3 きろくあり"');
    expect(html).not.toContain("4 きろくあり");
  });

  it("31日までの日付を並べる", () => {
    expect(html).toContain(">31<");
    expect(html).not.toContain(">32<");
  });
});

describe("RecentLogsPanel", () => {
  it("日付と形を行ごとに出す", () => {
    const html = renderToStaticMarkup(
      createElement(RecentLogsPanel, { title: "さいきんの うんち", rows: [{ key: "a", dayLabel: "きょう 7:40", shapeLabel: "ふつう" }], emptyLabel: "ないよ" }),
    );
    expect(html).toContain("きょう 7:40");
    expect(html).toContain("ふつう");
    expect(html).not.toContain("ないよ");
  });

  it("行がないときは空の案内を出す", () => {
    expect(renderToStaticMarkup(createElement(RecentLogsPanel, { title: "t", rows: [], emptyLabel: "ないよ" }))).toContain("ないよ");
  });
});
