import { useTranslation } from "react-i18next";

import "@/i18n/records";
import { MealRecords } from "@/features/meal/components/MealRecords";
import { ScreenFrame } from "@/components/ui";
import { spacing } from "@/theme";

export default function MealsScreen() {
  const { t } = useTranslation();
  return (
    <ScreenFrame title={t("Pages.meals.title")} description={t("Pages.meals.description")}>
      <MealRecords bottomInset={spacing.lg} />
    </ScreenFrame>
  );
}
