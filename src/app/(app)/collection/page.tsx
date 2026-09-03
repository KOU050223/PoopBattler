import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { getCollectionCharactersAction } from "@/features/collection/actions";
import { CollectionList } from "@/features/collection/components/collection-list";

export const metadata: Metadata = {
  title: "図鑑",
};

export default async function CollectionPage() {
  const characters = await getCollectionCharactersAction();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        title="図鑑"
        description="仲間になったうんちモンスターを集めます。"
      />
      <CollectionList characters={characters} />
    </div>
  );
}
