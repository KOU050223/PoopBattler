import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { getCollectionCharactersAction } from "@/features/collection/actions";
import { InventoryScreen } from "@/features/collection/components/inventory-screen";

export const metadata: Metadata = {
  title: "インベントリ",
};

export default async function CollectionPage() {
  const characters = await getCollectionCharactersAction();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        title="インベントリ"
        description="バトルに出す先発3体を入れ替えます。"
      />
      <InventoryScreen characters={characters} />
    </div>
  );
}
