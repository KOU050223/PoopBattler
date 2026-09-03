import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "バトル",
};

export default function BattlePage() {
  return (
    <>
      <PageHeader
        title="バトル"
        description="通常攻撃は自動です。必殺の準備中だけ、踏ん張りで発射します。"
      />
      <EmptyState
        title="挑戦できる敵がいません"
        description="先に食事を記録すると、その食事に応じた敵が現れます。"
      />
    </>
  );
}
