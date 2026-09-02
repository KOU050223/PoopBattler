import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { saveMealLogAction } from "@/features/meal/actions";
import { MealLogForm } from "@/features/meal/components/meal-log-form";

export const metadata: Metadata = {
  title: "食事の記録",
};

export default function MealsPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <PageHeader
        title="食事の記録"
        description="写真とタグを残しておくと、バトル中にうんちくんへあげられます。"
      />
      <MealLogForm onSave={saveMealLogAction} />
    </div>
  );
}
