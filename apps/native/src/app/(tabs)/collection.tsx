import { useTranslation } from "react-i18next";

import { ScreenPlaceholder } from "@/components/ScreenPlaceholder";

export default function CollectionScreen() {
  const { t } = useTranslation();
  return <ScreenPlaceholder title={t("Pages.collection.title")} description={t("Pages.collection.description")} />;
}
