import type { Metadata } from "next";

import { getBattleHistoryAction } from "@/features/bowel-log/actions";
import { BattleHistoryList } from "@/features/bowel-log/components/battle-history-list";

export const metadata: Metadata = {
  title: "バトルの記録",
};

export default async function LogsPage() {
  const logs = await getBattleHistoryAction();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col">
      <header className="logs-page-header">
        <h1>バトルの記録</h1>
        <p>戦いの結果と、その日のコンディションを振り返ろう。</p>
      </header>
      <BattleHistoryList logs={logs} />
    </div>
  );
}
