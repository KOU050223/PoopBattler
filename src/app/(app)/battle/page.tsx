import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = {
  title: "バトル",
};

export default function BattlePage() {
  return (
    <>
      <PageHeader
        title="バトル"
        description="端末を振ってうんちモンスターにダメージを与えます。"
      />
      <EmptyState
        title="挑戦できる敵がいません"
        description="先に食事を記録すると、その食事に応じた敵が現れます。"
      />
    </>
  );
}
