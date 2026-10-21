import { useTranslation } from "react-i18next";

import "@/i18n/records";
import { CollectionView } from "@/features/collection/components/collection-view";
import { ScreenFrame } from "@/components/ui";
import { spacing } from "@/theme";

export default function CollectionScreen() {
  const { t } = useTranslation();
  return (
    <ScreenFrame title={t("Pages.collection.title")} description={t("Pages.collection.description")}>
      <CollectionView bottomInset={spacing.lg} />
    </ScreenFrame>
  );
}
