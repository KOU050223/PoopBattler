import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { getBattleHistoryAction } from "@/features/bowel-log/actions";
import { BattleHistoryList } from "@/features/bowel-log/components/battle-history-list";

export const metadata: Metadata = {
  title: "排便の記録",
};

export default async function LogsPage() {
  const logs = await getBattleHistoryAction();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        title="排便の記録"
        description="バトルの結果と一緒に残した記録を振り返れます。"
      />
      <BattleHistoryList logs={logs} />
    </div>
  );
}
