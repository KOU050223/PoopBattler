import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/ui/empty-state";
import { getAccountStatusAction } from "@/features/account/actions";
import { getWeeklyReportAction } from "@/features/report/actions";
import { TeaserReport } from "@/features/report/components/teaser-report";
import { WeeklyReportView } from "@/features/report/components/weekly-report-view";

export const metadata: Metadata = {
  title: "今週のうんちレポート",
};

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ReportPage({ searchParams }: Props) {
  const t = await getTranslations("Report");
  const [result, account, params] = await Promise.all([
    getWeeklyReportAction(),
    getAccountStatusAction(),
    searchParams,
  ]);

  if (!result) {
    return <EmptyState title={t("errorTitle")} description={t("errorDescription")} />;
  }

  // Stripe から戻ってきた直後の案内。購入直後は Webhook の反映が
  // 間に合わないことがあるため、権利が付いていなくても結果を伝える。
  const purchase = params.purchase;
  const notice = purchase === "success"
    ? t("purchaseSuccess")
    : purchase === "canceled"
      ? t("purchaseCanceled")
      : null;

  // 権利の判定は getWeeklyReportAction が済ませている。ここで分岐するのは
  // 表示だけで、非課金の結果にはそもそも分析値が入っていない。
  if (!result.entitled) {
    return (
      <div className="mx-auto w-full max-w-2xl pb-3">
        <ReportPageHeader />
        {notice ? <PurchaseNotice message={notice} /> : null}
        <TeaserReport
          teaser={result.teaser}
          account={account}
          hasSubscription={result.hasSubscription}
        />
      </div>
    );
  }

  return <WeeklyReportView report={result.report} notice={notice} />;
}

async function ReportPageHeader() {
  const t = await getTranslations("Report");

  return (
    <header className="mb-5">
      <p className="mb-1 text-sm font-bold text-charcoal">{t("premium")}</p>
      <h1 className="text-[1.75rem] font-black tracking-[-0.04em] text-charcoal sm:text-3xl">
        {t("title")}
      </h1>
    </header>
  );
}

function PurchaseNotice({ message }: { message: string }) {
  return (
    <p
      role="status"
      className="mb-5 rounded-2xl bg-blush-wash px-4 py-3 text-sm font-medium text-charcoal"
    >
      {message}
    </p>
  );
}
