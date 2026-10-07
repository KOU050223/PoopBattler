import { useTranslation } from "react-i18next";

import { ScreenPlaceholder } from "@/components/ScreenPlaceholder";

export default function BattleScreen() {
  const { t } = useTranslation();
  return <ScreenPlaceholder title={t("Pages.battle.title")} description={t("Pages.battle.description")} />;
}
