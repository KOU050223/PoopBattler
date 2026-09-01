import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = {
  title: "排便の記録",
};

export default function LogsPage() {
  return (
    <>
      <PageHeader
        title="排便の記録"
        description="バトルの結果と一緒に残した記録を振り返れます。"
      />
      <EmptyState
        title="まだ記録がありません"
        description="バトルに勝つと、そのときの記録がここに残ります。"
      />
    </>
  );
}
