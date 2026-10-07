import { useTranslation } from "react-i18next";

import { ScreenPlaceholder } from "@/components/ScreenPlaceholder";

export default function AccountScreen() {
  const { t } = useTranslation();
  return <ScreenPlaceholder title={t("Pages.account.title")} description={t("Pages.account.description")} />;
}
