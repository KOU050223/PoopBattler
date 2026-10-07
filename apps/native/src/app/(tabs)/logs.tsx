import { useTranslation } from "react-i18next";

import { ScreenPlaceholder } from "@/components/ScreenPlaceholder";

export default function LogsScreen() {
  const { t } = useTranslation();
  return <ScreenPlaceholder title={t("Pages.logs.title")} description={t("Pages.logs.description")} />;
}
