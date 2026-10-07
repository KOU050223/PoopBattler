import { useTranslation } from "react-i18next";

import { ScreenPlaceholder } from "@/components/ScreenPlaceholder";

export default function ReportScreen() {
  const { t } = useTranslation();
  return <ScreenPlaceholder title={t("Report.entryTitle")} description={t("Report.entryDescription")} />;
}
