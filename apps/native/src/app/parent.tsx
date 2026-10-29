import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { ListRow, ParentCard, ParentScreen } from "@/design/parent";

export default function ParentMenuScreen() {
  const { t } = useTranslation();
  return (
    <ParentScreen title={t("ParentMenu.title")} onBack={() => router.back()}>
      <ParentCard>
        <ListRow label={t("ParentMenu.report")} onPress={() => router.push("/report")} />
        <ListRow label={t("ParentMenu.plan")} onPress={() => router.push("/purchase")} />
        <ListRow label={t("ParentMenu.account")} onPress={() => router.push("/account")} />
      </ParentCard>
    </ParentScreen>
  );
}
