import { CalendarDays, ChartNoAxesCombined, LockKeyhole, Palette, Sparkles, Utensils } from "lucide-react";
import { useTranslations } from "next-intl";

import type { AccountStatus } from "@/features/account/account.types";

import type { ReportTeaser } from "../actions";
import { createTeaserPlaceholder } from "../teaser-placeholder";

import { BarChart } from "./charts/bar-chart";
import { ShareBar } from "./charts/share-bar";
import { TrendLine } from "./charts/trend-line";
import { ManageSubscriptionLink } from "./manage-subscription-link";
import { PurchaseCallToAction } from "./purchase-call-to-action";

import { BOWEL_COLOR_LABELS, weekdayShortLabel, type BowelColor, type Weekday } from "../report-labels";

type Props = {
  teaser: ReportTeaser;
  account: AccountStatus;
  /** 購読の行はあるが権利が無い（支払い失敗など）。管理画面への導線を出す。 */
  hasSubscription?: boolean;
};

const CARD = "rounded-2xl bg-paper-white p-5 shadow-[0_8px_24px_rgb(201_77_127_/_0.1)] sm:p-6";
const HEADING = "text-lg font-black tracking-[-0.025em] text-charcoal";

/**
 * 非課金ユーザーへ見せるレポート。
 *
 * ぼかしの下に描いているのは見本の値で、その人の記録ではない。実データに
 * ぼかしを掛ける作りにすると、DevToolsでスタイルを消せば読めてしまううえ、
 * そもそもRSCペイロードに実値が載る。件数と記録日数だけは無料枠として
 * ぼかしの外に置く。
 */
export function TeaserReport({ teaser, account, hasSubscription = false }: Props) {
  const t = useTranslations("Report");
  const placeholder = createTeaserPlaceholder(teaser.bowelCount);

  return (
    <div className="space-y-5">
      <section className={CARD}>
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blush-wash text-flush-edge">
            <CalendarDays aria-hidden="true" className="size-5" />
          </div>
          <div>
            <h2 className={HEADING}>{t("recordedCount", { count: teaser.bowelCount })}</h2>
            <p className="mt-1 text-sm leading-relaxed text-pencil-gray">
              {t("recordedDays", { count: teaser.recordedDays })}
            </p>
          </div>
        </div>
      </section>

      {/*
        見本であることを、ぼかしの外の読める位置に必ず置く。ぼかしは
        aria-hidden なので、これが無いとスクリーンリーダーには
        「何かが隠されている」ことすら伝わらない。
      */}
      <section className={`${CARD} relative overflow-hidden`}>
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-md bg-blush-wash px-2 py-1 text-[11px] font-bold text-flush-edge">
          <LockKeyhole aria-hidden="true" className="size-3.5" />
          {t("teaserSampleLabel")}
        </p>
        <div
          aria-hidden="true"
          className="pointer-events-none select-none blur-[5px]"
        >
          <SamplePreview placeholder={placeholder} />
        </div>
      </section>

      <section className={`${CARD} text-center`} aria-labelledby="locked-report-title">
        <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-flush-pink text-paper-white">
          <Sparkles aria-hidden="true" className="size-5" />
        </div>
        <h2 id="locked-report-title" className="mt-3 text-lg font-black text-charcoal">
          {t("lockedTitle")}
        </h2>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-charcoal">
          {t("lockedDescription")}
        </p>
        <PurchaseCallToAction account={account} />
        {/*
          支払いに失敗した人は購入し直すのではなく、支払い方法を直す必要がある。
          その導線がここに無いと、Stripeへ辿り着く手段が画面から消える。
        */}
        {hasSubscription ? <ManageSubscriptionLink /> : null}
      </section>
    </div>
  );
}

/**
 * ぼかしの下に敷く見本。実データは受け取らない。
 *
 * 本レポートと同じチャート部品で描く。ここだけ古い見た目のままにすると、
 * ぼかしを外して買った人が「見本と違うもの」を受け取ることになる。
 */
function SamplePreview({ placeholder }: { placeholder: ReturnType<typeof createTeaserPlaceholder> }) {
  const t = useTranslations("Report");
  const weekdays: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const timeOfDayKeys = ["morning", "afternoon", "evening", "night"] as const;
  const timeOfDayColors = ["#ffd28f", "var(--color-flush-pink)", "var(--color-flush-edge)", "var(--color-night-ink)"];

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <ChartNoAxesCombined aria-hidden="true" className="size-5 text-flush-edge" />
          <h3 className={HEADING}>{t("highlights")}</h3>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[t("bowelCount"), t("recordDays"), t("averageHardness"), t("stableRate")].map((label, index) => (
            <div key={label} className="rounded-xl bg-blush-wash/55 p-3">
              <p className="text-xs font-medium text-pencil-gray">{label}</p>
              <p className="mt-1 text-xl font-black tabular-nums tracking-[-0.03em] text-charcoal">
                {placeholder.metrics[index]?.value}
              </p>
              <p className="mt-1 text-[11px] font-medium text-pencil-gray">
                {placeholder.metrics[index]?.detail}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className={HEADING}>{t("hardnessTitle")}</h3>
        <BarChart
          ariaLabel={t("recordsByHardness")}
          emptyLabel={t("noRecords")}
          bars={placeholder.hardnessHeights.map((height, index) => ({
            label: String(index + 1),
            value: height,
            highlighted: index + 1 >= 3 && index + 1 <= 5,
          }))}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-black text-charcoal">{t("amount")}</h3>
          <ShareBar
            ariaLabel={t("amount")}
            emptyLabel={t("noRecords")}
            segments={[t("small"), t("normal"), t("large")].map((label, index) => ({
              key: label,
              label,
              value: placeholder.amount[index] ?? 0,
              color: ["var(--color-cotton-pink)", "var(--color-flush-pink)", "var(--color-flush-edge)"][index],
            }))}
          />
        </div>
        <div>
          <h3 className="text-sm font-black text-charcoal">{t("ease")}</h3>
          <ShareBar
            ariaLabel={t("ease")}
            emptyLabel={t("noRecords")}
            segments={[t("easy"), t("normal"), t("hard")].map((label, index) => ({
              key: label,
              label,
              value: placeholder.ease[index] ?? 0,
              color: ["var(--color-cotton-pink)", "var(--color-flush-pink)", "var(--color-flush-edge)"][index],
            }))}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2">
          <Palette aria-hidden="true" className="size-5 text-flush-edge" />
          <h3 className={HEADING}>{t("colorTitle")}</h3>
        </div>
        <ShareBar
          ariaLabel={t("colorTitle")}
          emptyLabel={t("noRecords")}
          segments={(Object.keys(BOWEL_COLOR_LABELS) as BowelColor[]).map((key, index) => ({
            key,
            label: BOWEL_COLOR_LABELS[key].label,
            value: placeholder.colorCounts[index] ?? 0,
            color: BOWEL_COLOR_LABELS[key].hex,
          }))}
        />
      </div>

      <div>
        <h3 className={HEADING}>{t("weekdayAndTime")}</h3>
        <BarChart
          ariaLabel={t("weekdayAndTime")}
          emptyLabel={t("noRecords")}
          height="sm"
          bars={weekdays.map((weekday, index) => ({
            label: weekdayShortLabel(weekday),
            value: placeholder.weekdayCounts[index] ?? 0,
          }))}
        />
        <h4 className="mt-4 text-sm font-black text-charcoal">{t("timeOfDay")}</h4>
        <ShareBar
          ariaLabel={t("timeOfDay")}
          emptyLabel={t("noRecords")}
          segments={timeOfDayKeys.map((key, index) => ({
            key,
            label: t(key),
            value: placeholder.timeOfDayCounts[index] ?? 0,
            color: timeOfDayColors[index],
          }))}
        />
      </div>

      <div>
        <h3 className={HEADING}>{t("fourWeekTrend")}</h3>
        <TrendLine
          ariaLabel={t("fourWeekTrend")}
          emptyLabel={t("noRecords")}
          points={placeholder.fourWeekTrend.map((week, index) => ({
            key: String(index),
            label: `${index + 1}${t("week")}`,
            value: week.count,
            caption: t("average", { value: week.average }),
          }))}
        />
      </div>

      <div>
        <div className="flex items-center gap-2">
          <Utensils aria-hidden="true" className="size-5 text-flush-edge" />
          <h3 className={HEADING}>{t("mealFoodGroupAnalysis")}</h3>
        </div>
        <ul className="mt-4 space-y-3">
          {placeholder.mealFoodGroups.map((entry, index) => (
            <li key={index} className="rounded-xl bg-blush-wash/45 p-3">
              <p className="text-sm font-medium text-pencil-gray">
                {t("mealCount", { count: entry.mealCount })}
              </p>
              <div className="mt-2.5 space-y-1.5">
                {[
                  { label: t("within24"), value: entry.within24, strong: true },
                  { label: t("within48"), value: entry.within48, strong: false },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-2">
                    <p className="w-14 shrink-0 text-[11px] font-medium text-pencil-gray">{row.label}</p>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-paper-white">
                      <div
                        className={`h-full rounded-full ${row.strong ? "bg-flush-edge" : "bg-cotton-pink"}`}
                        style={{ width: `${Math.max(4, (row.value / entry.within48) * 100)}%` }}
                      />
                    </div>
                    <p className="w-8 shrink-0 text-right text-[11px] font-black tabular-nums text-charcoal">{row.value}</p>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
