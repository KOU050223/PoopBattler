import { CalendarDays, ChartNoAxesCombined, LockKeyhole, Sparkles, Utensils } from "lucide-react";
import { useTranslations } from "next-intl";

import type { AccountStatus } from "@/features/account/account.types";

import type { ReportTeaser } from "../actions";
import { createTeaserPlaceholder } from "../teaser-placeholder";

import { ManageSubscriptionLink } from "./manage-subscription-link";
import { PurchaseCallToAction } from "./purchase-call-to-action";

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

/** ぼかしの下に敷く見本。実データは受け取らない。 */
function SamplePreview({ placeholder }: { placeholder: ReturnType<typeof createTeaserPlaceholder> }) {
  const t = useTranslations("Report");

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
              <p className="mt-1 text-xl font-black tracking-[-0.03em] text-charcoal">
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
        <div className="mt-4 grid grid-cols-7 gap-2">
          {placeholder.hardnessHeights.map((height, index) => (
            <div key={index} className="text-center">
              <div className="flex h-24 items-end rounded-lg bg-blush-wash/50 p-1">
                <div className="w-full rounded-md bg-flush-pink" style={{ height: `${height}%` }} />
              </div>
              <p className="mt-2 text-xs font-black text-charcoal">{index + 1}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className={HEADING}>{t("fourWeekTrend")}</h3>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {placeholder.fourWeekTrend.map((week, index) => (
            <div key={index} className="rounded-xl bg-blush-wash/45 p-3">
              <p className="mt-1 text-lg font-black text-charcoal">{week.count}</p>
              <p className="mt-1 text-[11px] text-pencil-gray">{t("average", { value: week.average })}</p>
            </div>
          ))}
        </div>
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
              <p className="mt-1 text-sm text-pencil-gray">
                {t("mealAnalysis", {
                  within24: entry.within24,
                  within48: entry.within48,
                  average24: "-",
                  average48: "-",
                })}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
