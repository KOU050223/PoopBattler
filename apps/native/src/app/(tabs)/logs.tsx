import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import "@/i18n/records";
import { BattleHistory } from "@/features/bowel-log/components/BattleHistory";
import { MealRecords } from "@/features/meal/components/MealRecords";
import { ScreenFrame, Segmented } from "@/features/records-ui";
import { spacing } from "@/theme";

// 既存タブ名が logs のため、記録タブ本体はここ（ロジックは features 配下）。
export default function RecordsScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"meals" | "battles">("meals");
  return (
    <ScreenFrame title={t("Navigation.logs")}>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[{ value: "meals", label: t("Records.tabMeals") }, { value: "battles", label: t("Records.tabBattles") }]}
      />
      <View style={{ flex: 1 }}>
        {tab === "meals" ? <MealRecords bottomInset={spacing.lg} /> : <BattleHistory bottomInset={spacing.lg} />}
      </View>
    </ScreenFrame>
  );
}
