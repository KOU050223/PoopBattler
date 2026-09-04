import { ChartNoAxesCombined, Clock, Palette, Sparkles, Utensils } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { ManageSubscriptionLink } from "./manage-subscription-link";

import { getMealFoodGroupLabel } from "@/features/meal/meal.types";

import { BarChart, EmptyChart } from "./charts/bar-chart";
import { ShareBar } from "./charts/share-bar";
import { TrendLine } from "./charts/trend-line";

import { BOWEL_COLOR_LABELS, weekdayLabel, weekdayShortLabel, type BowelColor, type Weekday } from "../report-labels";
import type { WeeklyReport } from "../weekly-report";

type Props = {
  report: WeeklyReport;
  /** 購入直後などに出す案内。無ければ null。 */
  notice?: string | null;
};

const CARD = "rounded-2xl bg-paper-white p-5 shadow-[0_8px_24px_rgb(201_77_127_/_0.1)] sm:p-6";
const HEADING = "text-lg font-black tracking-[-0.025em] text-charcoal";
const WEEKDAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function signedCount(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function ReportHeader({ report }: { report: WeeklyReport }) {
  const t = useTranslations("Report");
  const locale = useLocale();
  const start = new Intl.DateTimeFormat(locale, { month: "numeric", day: "numeric", timeZone: "Asia/Tokyo" }).format(new Date(report.range.startsAt));
  const end = new Intl.DateTimeFormat(locale, { month: "numeric", day: "numeric", timeZone: "Asia/Tokyo" }).format(new Date(report.range.endsAt));

  return (
    <header className="mb-5">
      <p className="mb-1 inline-flex items-center gap-1.5 text-sm font-bold text-charcoal"><ChartNoAxesCombined aria-hidden="true" className="size-4" />{t("premium")}</p>
      <h1 className="text-[1.75rem] font-black tracking-[-0.04em] text-charcoal sm:text-3xl">{t("title")}</h1>
      <p className="mt-1 text-[15px] font-medium text-charcoal">{t("range", { start, end })}</p>
    </header>
  );
}

/** 権利のある利用者へ見せる本レポート。権利の判定は actions.ts が行う。 */
export function WeeklyReportView({ report, notice = null }: Props) {
  return (
    <div className="mx-auto w-full max-w-2xl pb-3">
      <ReportHeader report={report} />
      {notice ? (
        <p
          role="status"
          className="mb-5 rounded-2xl bg-blush-wash px-4 py-3 text-sm font-medium text-charcoal"
        >
          {notice}
        </p>
      ) : null}
      <PremiumReport report={report} />
      <ManageSubscriptionLink />
    </div>
  );
}

function PremiumReport({ report }: { report: WeeklyReport }) {
  const t = useTranslations("Report");
  const locale = useLocale();
  const { summary, breakdown, mealRelationships, analysis } = report;
  const dayFormat = new Intl.DateTimeFormat(locale, { month: "numeric", day: "numeric", timeZone: "Asia/Tokyo" });
  const weekdayFormat = new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "Asia/Tokyo" });

  return (
    <div className="space-y-5">
      <section className={CARD} aria-labelledby="report-highlight-title">
        <div className="flex items-center gap-2"><Sparkles aria-hidden="true" className="size-5 text-flush-edge" /><h2 id="report-highlight-title" className={HEADING}>{t("highlights")}</h2></div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label={t("bowelCount")} value={t("times", { count: summary.bowelCount })} detail={t("comparedLastWeek", { count: signedCount(summary.countChangeFromPreviousWeek) })} />
          <Metric label={t("recordDays")} value={t("days", { count: summary.recordedDays })} detail={t("thisWeek")} />
          <Metric label={t("averageHardness")} value={summary.averageHardness?.toFixed(1) ?? "-"} detail={t("hardnessScale")} />
          <Metric label={t("stableRate")} value={summary.stableRate === null ? "-" : `${summary.stableRate}%`} detail={t("thisWeek")} />
        </div>
      </section>

      <section className={CARD} aria-labelledby="hardness-title">
        <h2 id="hardness-title" className={HEADING}>{t("hardnessTitle")}</h2>
        <p className="mt-1 text-sm text-pencil-gray">{t("hardnessDescription")}</p>
        {/*
          3から5を濃い色にするのは、ハイライトの「3から5の割合」と同じ帯を
          指しているため。数字と図で別々の話をすると読み手が突き合わせられない。
        */}
        <BarChart
          ariaLabel={t("recordsByHardness")}
          emptyLabel={t("noRecords")}
          bars={breakdown.hardness.map((count, index) => ({
            label: String(index + 1),
            value: count,
            highlighted: index + 1 >= 3 && index + 1 <= 5,
          }))}
          unit={t("times", { count: "" })}
        />
        <p className="mt-3 text-xs text-pencil-gray">{t("stableBandNote")}</p>
      </section>

      <section className={CARD} aria-labelledby="condition-title">
        <h2 id="condition-title" className={HEADING}>{t("otherRecords")}</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-black text-charcoal">{t("amount")}</h3>
            <ShareBar
              ariaLabel={t("amount")}
              emptyLabel={t("noRecords")}
              segments={[
                { key: "small", label: t("small"), value: breakdown.amount.small, color: "var(--color-cotton-pink)" },
                { key: "normal", label: t("normal"), value: breakdown.amount.normal, color: "var(--color-flush-pink)" },
                { key: "large", label: t("large"), value: breakdown.amount.large, color: "var(--color-flush-edge)" },
              ]}
            />
          </div>
          <div>
            <h3 className="text-sm font-black text-charcoal">{t("ease")}</h3>
            <ShareBar
              ariaLabel={t("ease")}
              emptyLabel={t("noRecords")}
              segments={[
                { key: "easy", label: t("easy"), value: breakdown.ease.easy, color: "var(--color-cotton-pink)" },
                { key: "normal", label: t("normal"), value: breakdown.ease.normal, color: "var(--color-flush-pink)" },
                { key: "hard", label: t("hard"), value: breakdown.ease.hard, color: "var(--color-flush-edge)" },
              ]}
            />
          </div>
        </div>
      </section>

      <section className={CARD} aria-labelledby="color-title">
        <div className="flex items-center gap-2"><Palette aria-hidden="true" className="size-5 text-flush-edge" /><h2 id="color-title" className={HEADING}>{t("colorTitle")}</h2></div>
        <ShareBar
          ariaLabel={t("colorTitle")}
          emptyLabel={t("noRecords")}
          segments={(Object.keys(BOWEL_COLOR_LABELS) as BowelColor[]).map((key) => ({
            key,
            label: BOWEL_COLOR_LABELS[key].label,
            value: breakdown.color[key],
            color: BOWEL_COLOR_LABELS[key].hex,
          }))}
        />
      </section>

      <section className={CARD} aria-labelledby="trend-title">
        <h2 id="trend-title" className={HEADING}>{t("dailyRecords")}</h2>
        <BarChart
          ariaLabel={t("dailyRecords")}
          emptyLabel={t("noRecords")}
          height="sm"
          bars={analysis.dailyCounts.map((day) => ({
            label: weekdayFormat.format(new Date(`${day.date}T00:00:00+09:00`)),
            caption: dayFormat.format(new Date(`${day.date}T00:00:00+09:00`)),
            value: day.count,
          }))}
        />
      </section>

      <section className={CARD} aria-labelledby="weekday-title">
        <h2 id="weekday-title" className={HEADING}>{t("weekdayAndTime")}</h2>
        <p className="mt-1 text-sm text-pencil-gray">{t("mostFrequentWeekdayShort", { weekday: mostFrequentWeekdays(analysis.weekdayCounts, t("noRecords")) })}</p>
        <BarChart
          ariaLabel={t("weekdayAndTime")}
          emptyLabel={t("noRecords")}
          height="sm"
          bars={WEEKDAYS.map((weekday) => ({ label: weekdayShortLabel(weekday), value: analysis.weekdayCounts[weekday] }))}
        />
        <h3 className="mt-5 flex items-center gap-1.5 text-sm font-black text-charcoal"><Clock aria-hidden="true" className="size-4 text-flush-edge" />{t("timeOfDay")}</h3>
        {/* 夜と深夜を1つに丸めない。「22時以降だけが多い」は本人にしか意味が分からない差で、丸めると消える。 */}
        <ShareBar
          ariaLabel={t("timeOfDay")}
          emptyLabel={t("noRecords")}
          segments={[
            { key: "morning", label: t("morning"), value: analysis.timeOfDayCounts.morning, color: "#ffd28f" },
            { key: "afternoon", label: t("afternoon"), value: analysis.timeOfDayCounts.afternoon, color: "var(--color-flush-pink)" },
            { key: "evening", label: t("evening"), value: analysis.timeOfDayCounts.evening, color: "var(--color-flush-edge)" },
            { key: "night", label: t("night"), value: analysis.timeOfDayCounts.night, color: "var(--color-night-ink)" },
          ]}
        />
      </section>

      <section className={CARD} aria-labelledby="four-week-title">
        <h2 id="four-week-title" className={HEADING}>{t("fourWeekTrend")}</h2>
        <TrendLine
          ariaLabel={t("fourWeekTrend")}
          emptyLabel={t("noRecords")}
          points={analysis.fourWeekTrend.map((week) => ({
            key: week.weekStartsAt,
            label: `${dayFormat.format(new Date(week.weekStartsAt))}${t("week")}`,
            value: week.bowelCount,
            caption: t("average", { value: week.averageHardness ?? "-" }),
          }))}
        />
      </section>

      <section className={CARD} aria-labelledby="meal-title">
        <div className="flex items-center gap-2"><Utensils aria-hidden="true" className="size-5 text-flush-edge" /><h2 id="meal-title" className={HEADING}>{t("mealRelationship")}</h2></div>
        {mealRelationships.length === 0 ? <EmptyChart label={t("noMealRelationship")} /> : (
          <ul className="mt-4 space-y-2.5" aria-label={t("mealRelationship")}>
            {mealRelationships.map((relationship) => (
              <MealRelationshipRow
                key={relationship.foodGroup}
                label={getMealFoodGroupLabel(relationship.foodGroup)}
                count={relationship.relatedBowelCount}
                max={Math.max(...mealRelationships.map((entry) => entry.relatedBowelCount))}
                detail={t("relatedBowel", { count: relationship.relatedBowelCount, average: relationship.averageHardness.toFixed(1) })}
                caption={t("average", { value: relationship.averageHardness.toFixed(1) })}
              />
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs leading-relaxed text-pencil-gray">{t("mealDisclaimer")}</p>
      </section>

      <section className={CARD} aria-labelledby="meal-analysis-title">
        <h2 id="meal-analysis-title" className={HEADING}>{t("mealFoodGroupAnalysis")}</h2>
        {analysis.mealFoodGroupAnalyses.length === 0 ? <EmptyChart label={t("noMealFoodGroupAnalysis")} /> : (
          <ul className="mt-4 space-y-3">
            {analysis.mealFoodGroupAnalyses.map((entry) => (
              <li key={entry.foodGroup} className="rounded-xl bg-blush-wash/45 p-3">
                <p className="font-bold text-charcoal">{getMealFoodGroupLabel(entry.foodGroup)} <span className="text-sm font-medium text-pencil-gray">{t("mealCount", { count: entry.mealCount })}</span></p>
                {/* 24時間と48時間を並べた帯にする。数字2つの比較は、長さの差にした方が速い。 */}
                <div className="mt-2.5 space-y-1.5">
                  <WindowBar label={t("within24")} value={entry.relatedWithin24Hours} max={entry.relatedWithin48Hours} average={entry.averageHardnessWithin24Hours} averageLabel={t("average", { value: entry.averageHardnessWithin24Hours ?? "-" })} strong />
                  <WindowBar label={t("within48")} value={entry.relatedWithin48Hours} max={entry.relatedWithin48Hours} average={entry.averageHardnessWithin48Hours} averageLabel={t("average", { value: entry.averageHardnessWithin48Hours ?? "-" })} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-xl bg-blush-wash/55 p-3"><p className="text-xs font-medium text-pencil-gray">{label}</p><p className="mt-1 text-xl font-black tabular-nums tracking-[-0.03em] text-charcoal">{value}</p><p className="mt-1 text-[11px] font-medium text-pencil-gray">{detail}</p></div>;
}

/** 食品群ごとの関連件数を、横棒の長さで比べられるようにする。 */
function MealRelationshipRow({ label, count, max, detail, caption }: { label: string; count: number; max: number; detail: string; caption: string }) {
  return (
    <li className="rounded-xl bg-blush-wash/45 p-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-bold text-charcoal">{label}</p>
        <p className="shrink-0 text-sm font-black tabular-nums text-charcoal">{count}</p>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-paper-white">
        <div className="h-full rounded-full bg-flush-pink" style={{ width: `${max === 0 ? 0 : Math.max(4, (count / max) * 100)}%` }} />
      </div>
      {/* 読み上げには1文で渡す。数字だけが並ぶと、何の数字か分からない。 */}
      <p className="sr-only">{detail}</p>
      <p aria-hidden="true" className="mt-1.5 text-xs text-pencil-gray">{caption}</p>
    </li>
  );
}

function WindowBar({ label, value, max, average, averageLabel, strong = false }: { label: string; value: number; max: number; average: number | null; averageLabel: string; strong?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <p className="w-14 shrink-0 text-[11px] font-medium text-pencil-gray">{label}</p>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-paper-white">
        <div className={`h-full rounded-full ${strong ? "bg-flush-edge" : "bg-cotton-pink"}`} style={{ width: `${max === 0 ? 0 : Math.max(4, (value / max) * 100)}%` }} />
      </div>
      <p className="w-24 shrink-0 text-right text-[11px] font-black tabular-nums text-charcoal">
        {value}
        <span className="ml-1 font-medium text-pencil-gray">{average === null ? "" : averageLabel}</span>
      </p>
    </div>
  );
}

function mostFrequentWeekdays(counts: Record<Weekday, number>, emptyLabel: string) {
  const highest = Math.max(...Object.values(counts));
  if (highest === 0) return emptyLabel;
  return (Object.entries(counts) as Array<[Weekday, number]>).filter(([, count]) => count === highest).map(([weekday]) => weekdayLabel(weekday)).join("・");
}
