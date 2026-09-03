import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { deleteMealLogAction, getMealLogsAction, replaceMealLogPhotoAction, saveMealLogAction } from "@/features/meal/actions";
import { MealLogForm } from "@/features/meal/components/meal-log-form";
import { MealLogList } from "@/features/meal/components/meal-log-list";

export const metadata: Metadata = {
  title: "食事の記録",
};

export default async function MealsPage() {
  const mealLogs = await getMealLogsAction();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <PageHeader
        title="食事の記録"
        description="写真とタグを残しておくと、バトル後の仲間化抽選に使えます。食事ログが多いほど仲間になりやすくなります。"
      />
      <MealLogForm onSave={saveMealLogAction} />
      <MealLogList initialLogs={mealLogs} onDelete={deleteMealLogAction} onReplacePhoto={replaceMealLogPhotoAction} />
    </div>
  );
}
