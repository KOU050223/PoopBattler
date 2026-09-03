import type { Metadata } from "next";

import { deleteMealLogAction, getMealLogsAction, replaceMealLogPhotoAction, saveMealLogAction } from "@/features/meal/actions";
import { MealLogForm } from "@/features/meal/components/meal-log-form";
import { MealLogList } from "@/features/meal/components/meal-log-list";

export const metadata: Metadata = {
  title: "今日、何食べた？",
};

export default async function MealsPage() {
  const mealLogs = await getMealLogsAction();

  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="meal-page-header">
        <h1>今日、何食べた？</h1>
        <p>食べたものが、次のうんちモンスターになる。</p>
      </header>
      <section aria-labelledby="meal-entry-title" className="meal-form-section">
        <h2 id="meal-entry-title">今日のごはん</h2>
        <MealLogForm onSave={saveMealLogAction} />
      </section>
      <MealLogList initialLogs={mealLogs} onDelete={deleteMealLogAction} onReplacePhoto={replaceMealLogPhotoAction} />
    </div>
  );
}
