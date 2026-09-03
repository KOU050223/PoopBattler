import { CalendarDays, ChartNoAxesCombined, LockKeyhole, Sparkles, Utensils } from "lucide-react";

import { MEAL_TAGS } from "@/features/meal/meal.types";

import { weekdayLabel, type Weekday } from "../report-labels";
import type { WeeklyReport } from "../weekly-report";

type Props = {
  report: WeeklyReport;
  isPremium: boolean;
};

const hardnessLabels = ["1", "2", "3", "4", "5", "6", "7"];
const amountLabels = { small: "少ない", normal: "普通", large: "多い" } as const;
const easeLabels = { easy: "すっきり", normal: "普通", hard: "出にくい" } as const;

function mealTagLabel(tag: string) {
  return MEAL_TAGS.find((entry) => entry.value === tag)?.label ?? tag;
}

function signedCount(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function ReportHeader({ report }: { report: WeeklyReport }) {
  const start = new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", timeZone: "Asia/Tokyo" }).format(new Date(report.range.startsAt));
  const end = new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", timeZone: "Asia/Tokyo" }).format(new Date(report.range.endsAt));

  return (
    <header className="mb-5">
      <p className="mb-1 inline-flex items-center gap-1.5 text-sm font-bold text-charcoal"><ChartNoAxesCombined aria-hidden="true" className="size-4" />プレミアム</p>
      <h1 className="text-[1.75rem] font-black tracking-[-0.04em] text-charcoal sm:text-3xl">今週のうんちレポート</h1>
      <p className="mt-1 text-[15px] font-medium text-charcoal">{start}から{end}までの記録を振り返ります。</p>
    </header>
  );
}

function LockedReport({ report }: { report: WeeklyReport }) {
  return (
    <>
      <section className="rounded-2xl bg-paper-white p-5 shadow-[0_8px_24px_rgb(201_77_127_/_0.1)] sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blush-wash text-flush-edge"><CalendarDays aria-hidden="true" className="size-5" /></div>
          <div>
            <h2 className="text-lg font-black tracking-[-0.025em] text-charcoal">今週は{report.summary.bowelCount}件記録しました</h2>
            <p className="mt-1 text-sm leading-relaxed text-pencil-gray">{report.summary.recordedDays}日分の記録があります。集計・比較・食事との傾向はプレミアムで振り返れます。</p>
          </div>
        </div>
      </section>
      <section className="mt-5 rounded-2xl bg-paper-white p-5 text-center shadow-[0_8px_24px_rgb(201_77_127_/_0.1)] sm:p-6" aria-labelledby="locked-report-title">
        <div className="flex size-10 items-center justify-center rounded-full bg-flush-pink text-paper-white mx-auto"><LockKeyhole aria-hidden="true" className="size-5" /></div>
        <h2 id="locked-report-title" className="mt-3 text-lg font-black text-charcoal">今週の傾向を、もっと詳しく</h2>
        <p className="mt-1 max-w-sm mx-auto text-sm leading-relaxed text-charcoal">硬さの変化や食事と排便の傾向を、プレミアムで確認できます。</p>
        <button type="button" disabled className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-flush-pink px-5 text-sm font-black text-paper-white opacity-60" title="プレミアムの購入機能は準備中です"><Sparkles aria-hidden="true" className="size-4" />プレミアムで見る</button>
        <p className="mt-2 text-xs font-medium text-charcoal">プレミアムの購入機能は準備中です。</p>
      </section>
    </>
  );
}

export function WeeklyReportView({ report, isPremium }: Props) {
  return (
    <div className="mx-auto w-full max-w-2xl pb-3">
      <ReportHeader report={report} />
      {isPremium ? <PremiumReport report={report} /> : <LockedReport report={report} />}
    </div>
  );
}

function PremiumReport({ report }: { report: WeeklyReport }) {
  const { summary, breakdown, mealRelationships, analysis } = report;
  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-paper-white p-5 shadow-[0_8px_24px_rgb(201_77_127_/_0.1)] sm:p-6" aria-labelledby="report-highlight-title">
        <div className="flex items-center gap-2"><Sparkles aria-hidden="true" className="size-5 text-flush-edge" /><h2 id="report-highlight-title" className="text-lg font-black tracking-[-0.025em] text-charcoal">今週のハイライト</h2></div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="排便回数" value={`${summary.bowelCount}回`} detail={`先週比 ${signedCount(summary.countChangeFromPreviousWeek)}回`} />
          <Metric label="記録日数" value={`${summary.recordedDays}日`} detail="今週の記録" />
          <Metric label="平均の硬さ" value={summary.averageHardness?.toFixed(1) ?? "-"} detail="1から7の記録" />
          <Metric label="3から5の割合" value={summary.stableRate === null ? "-" : `${summary.stableRate}%`} detail="今週の記録" />
        </div>
      </section>

      <section className="rounded-2xl bg-paper-white p-5 shadow-[0_8px_24px_rgb(201_77_127_/_0.1)] sm:p-6" aria-labelledby="hardness-title">
        <h2 id="hardness-title" className="text-lg font-black tracking-[-0.025em] text-charcoal">硬さの分布</h2>
        <p className="mt-1 text-sm text-pencil-gray">1が硬め、7がゆるめです。診断ではなく、あなたの記録を示します。</p>
        <ol className="mt-5 grid grid-cols-7 gap-2" aria-label="硬さ別の記録数">
          {breakdown.hardness.map((count, index) => <li key={hardnessLabels[index]} className="text-center"><div className="flex h-24 items-end rounded-lg bg-blush-wash/50 p-1"><div className="w-full rounded-md bg-flush-pink" style={{ height: `${count === 0 ? 0 : Math.max(10, (count / summary.bowelCount) * 100)}%` }} /></div><p className="mt-2 text-xs font-black text-charcoal">{hardnessLabels[index]}</p><p className="text-[11px] font-medium text-pencil-gray">{count}件</p></li>)}
        </ol>
      </section>

      <section className="rounded-2xl bg-paper-white p-5 shadow-[0_8px_24px_rgb(201_77_127_/_0.1)] sm:p-6" aria-labelledby="condition-title">
        <h2 id="condition-title" className="text-lg font-black tracking-[-0.025em] text-charcoal">ほかの記録</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Breakdown title="量" values={breakdown.amount} labels={amountLabels} />
          <Breakdown title="出やすさ" values={breakdown.ease} labels={easeLabels} />
        </div>
      </section>

      <section className="rounded-2xl bg-paper-white p-5 shadow-[0_8px_24px_rgb(201_77_127_/_0.1)] sm:p-6" aria-labelledby="trend-title">
        <h2 id="trend-title" className="text-lg font-black tracking-[-0.025em] text-charcoal">日別の記録</h2>
        <div className="mt-4 grid grid-cols-5 gap-2">{analysis.dailyCounts.map((day) => <div key={day.date} className="rounded-lg bg-blush-wash/45 p-2 text-center"><p className="text-[11px] text-pencil-gray">{day.date.slice(5).replace("-", "/")}</p><p className="mt-1 text-lg font-black text-charcoal">{day.count}</p><p className="text-[11px] text-pencil-gray">件</p></div>)}</div>
        <h3 className="mt-5 text-sm font-black text-charcoal">曜日・時間帯</h3>
        <p className="mt-2 text-sm text-pencil-gray">もっとも記録が多い曜日: {mostFrequentWeekdays(analysis.weekdayCounts)}。朝 {analysis.timeOfDayCounts.morning}件、昼 {analysis.timeOfDayCounts.afternoon}件、夜 {analysis.timeOfDayCounts.evening + analysis.timeOfDayCounts.night}件。</p>
      </section>

      <section className="rounded-2xl bg-paper-white p-5 shadow-[0_8px_24px_rgb(201_77_127_/_0.1)] sm:p-6" aria-labelledby="four-week-title">
        <h2 id="four-week-title" className="text-lg font-black tracking-[-0.025em] text-charcoal">4週間の推移</h2>
        <div className="mt-4 grid grid-cols-4 gap-2">{analysis.fourWeekTrend.map((week) => <div key={week.weekStartsAt} className="rounded-xl bg-blush-wash/45 p-3"><p className="text-[11px] text-pencil-gray">{new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", timeZone: "Asia/Tokyo" }).format(new Date(week.weekStartsAt))}週</p><p className="mt-1 text-lg font-black text-charcoal">{week.bowelCount}回</p><p className="mt-1 text-[11px] text-pencil-gray">平均 {week.averageHardness ?? "-"}</p></div>)}</div>
      </section>

      <section className="rounded-2xl bg-paper-white p-5 shadow-[0_8px_24px_rgb(201_77_127_/_0.1)] sm:p-6" aria-labelledby="meal-title">
        <div className="flex items-center gap-2"><Utensils aria-hidden="true" className="size-5 text-flush-edge" /><h2 id="meal-title" className="text-lg font-black tracking-[-0.025em] text-charcoal">食事との記録上の関連</h2></div>
        {mealRelationships.length === 0 ? <p className="mt-3 rounded-xl bg-blush-wash/45 p-3 text-sm leading-relaxed text-pencil-gray">食事と排便の両方を記録すると、24時間以内の記録上の関連をここで振り返れます。</p> : <ul className="mt-4 space-y-3">{mealRelationships.map((relationship) => <li key={relationship.tag} className="rounded-xl bg-blush-wash/45 p-3"><p className="font-bold text-charcoal">{mealTagLabel(relationship.tag)}</p><p className="mt-1 text-sm text-pencil-gray">{relationship.relatedBowelCount}件の排便記録と関連。平均の硬さは {relationship.averageHardness.toFixed(1)} です。</p></li>)}</ul>}
        <p className="mt-4 text-xs leading-relaxed text-pencil-gray">食事が原因であることを示すものではありません。あなたが記録した食事から24時間以内の排便を、振り返りやすく表示しています。</p>
      </section>

      <section className="rounded-2xl bg-paper-white p-5 shadow-[0_8px_24px_rgb(201_77_127_/_0.1)] sm:p-6" aria-labelledby="meal-analysis-title">
        <h2 id="meal-analysis-title" className="text-lg font-black tracking-[-0.025em] text-charcoal">食事タグ別の分析</h2>
        {analysis.mealTagAnalyses.length === 0 ? <p className="mt-3 text-sm leading-relaxed text-pencil-gray">同じ食事タグを5件以上、かつ24時間以内の排便を3件以上記録すると、ここに比較を表示します。</p> : <ul className="mt-4 space-y-3">{analysis.mealTagAnalyses.map((entry) => <li key={entry.tag} className="rounded-xl bg-blush-wash/45 p-3"><p className="font-bold text-charcoal">{mealTagLabel(entry.tag)} <span className="text-sm font-medium text-pencil-gray">{entry.mealCount}件の食事記録</span></p><p className="mt-1 text-sm text-pencil-gray">24時間内の関連 {entry.relatedWithin24Hours}件、48時間内 {entry.relatedWithin48Hours}件。平均の硬さは {entry.averageHardnessWithin24Hours ?? "-"} / {entry.averageHardnessWithin48Hours ?? "-"}。</p></li>)}</ul>}
      </section>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-xl bg-blush-wash/55 p-3"><p className="text-xs font-medium text-pencil-gray">{label}</p><p className="mt-1 text-xl font-black tracking-[-0.03em] text-charcoal">{value}</p><p className="mt-1 text-[11px] font-medium text-pencil-gray">{detail}</p></div>;
}

function Breakdown<T extends string>({ title, values, labels }: { title: string; values: Record<T, number>; labels: Record<T, string> }) {
  return <div><h3 className="text-sm font-black text-charcoal">{title}</h3><dl className="mt-2 grid grid-cols-3 gap-2">{(Object.keys(labels) as T[]).map((key) => <div key={key} className="rounded-lg bg-blush-wash/45 px-2.5 py-2"><dt className="text-[11px] font-medium text-pencil-gray">{labels[key]}</dt><dd className="mt-0.5 text-sm font-black text-charcoal">{values[key]}件</dd></div>)}</dl></div>;
}

function mostFrequentWeekdays(counts: Record<Weekday, number>) {
  const highest = Math.max(...Object.values(counts));
  if (highest === 0) return "記録なし";
  return (Object.entries(counts) as Array<[keyof typeof counts, number]>).filter(([, count]) => count === highest).map(([weekday]) => weekdayLabel(weekday)).join("・");
}
