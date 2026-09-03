import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { BattleScreen } from "@/features/battle/components/battle-screen";

export const metadata: Metadata = {
  title: "バトル",
};

export default function BattlePage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <PageHeader
        title="バトル"
        description="通常攻撃は自動です。必殺の準備中だけ、踏ん張りで発射します。"
      />
      <BattleScreen />
    </div>
  );
}
