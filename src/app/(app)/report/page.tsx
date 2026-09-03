import type { Metadata } from "next";

import { EmptyState } from "@/components/ui/empty-state";
import { getWeeklyReportAction } from "@/features/report/actions";
import { WeeklyReportView } from "@/features/report/components/weekly-report-view";

export const metadata: Metadata = {
  title: "今週のうんちレポート",
};

export default async function ReportPage() {
  const report = await getWeeklyReportAction();

  if (!report) {
    return <EmptyState title="レポートを作れませんでした" description="ログイン状態を確認して、もう一度お試しください。" />;
  }

  // 課金基盤の導入後、この値を subscriptions の有効な権利判定へ置き換える。
  // 無料ユーザーには詳細データを描画しないため、集計・解釈は表示されない。
  const isPremium = false;
  return <WeeklyReportView report={report} isPremium={isPremium} />;
}
