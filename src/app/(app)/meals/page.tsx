import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "食事の記録",
};

export default function MealsPage() {
  return (
    <>
      <PageHeader
        title="食事の記録"
        description="食べたものを撮影して残すと、次のバトルに出る敵が決まります。"
      />
      <EmptyState
        title="まだ食事の記録がありません"
        description="最初の食事を登録すると、ここに一覧が並びます。"
      />
    </>
  );
}
