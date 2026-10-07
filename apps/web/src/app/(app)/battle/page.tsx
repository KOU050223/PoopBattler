import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { BattleScreen } from "@/features/battle/components/battle-screen";

export const metadata: Metadata = {
  title: "バトル",
};

export default async function BattlePage() {
  const t = await getTranslations("Pages.battle");

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
      />
      <BattleScreen />
    </div>
  );
}
