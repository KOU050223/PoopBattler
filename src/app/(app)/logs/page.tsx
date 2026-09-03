import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { getBattleHistoryAction } from "@/features/bowel-log/actions";
import { BattleHistoryList } from "@/features/bowel-log/components/battle-history-list";
import { ReportEntryLink } from "@/features/report/components/report-entry-link";

export const metadata: Metadata = {
  title: "バトルの記録",
};

export default async function LogsPage() {
  const [logs, t] = await Promise.all([getBattleHistoryAction(), getTranslations("Pages.logs")]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col">
      <header className="logs-page-header">
        <h1>{t("title")}</h1>
        <p>{t("description")}</p>
      </header>
      <ReportEntryLink />
      <BattleHistoryList logs={logs} />
    </div>
  );
}
