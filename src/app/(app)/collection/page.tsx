import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = {
  title: "図鑑",
};

export default function CollectionPage() {
  return (
    <>
      <PageHeader
        title="図鑑"
        description="仲間になったうんちモンスターを集めます。"
      />
      <EmptyState
        title="まだ仲間がいません"
        description="バトルで撃破した敵が、抽選で仲間になります。"
      />
    </>
  );
}
