import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { getCollectionCharactersAction } from "@/features/collection/actions";
import { InventoryScreen } from "@/features/collection/components/inventory-screen";

export const metadata: Metadata = {
  title: "インベントリ",
};

export default async function CollectionPage() {
  const [characters, t] = await Promise.all([getCollectionCharactersAction(), getTranslations("Pages.collection")]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
      />
      <InventoryScreen characters={characters} />
    </div>
  );
}
