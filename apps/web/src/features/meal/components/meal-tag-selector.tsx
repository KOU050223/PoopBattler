"use client";

import { Check } from "lucide-react";

import { MEAL_FOOD_GROUPS, type MealFoodGroup } from "@/features/meal/meal.types";

type MealTagSelectorProps = {
  value: MealFoodGroup[];
  onChange: (foodGroups: MealFoodGroup[]) => void;
  error?: string;
  errorId: string;
};

/** 食品群を複数選択する。分類ごとに分け、選択漏れを減らす。 */
export function MealTagSelector({ value, onChange, error, errorId }: MealTagSelectorProps) {
  const toggle = (foodGroup: MealFoodGroup) => {
    onChange(value.includes(foodGroup) ? value.filter((current) => current !== foodGroup) : [...value, foodGroup]);
  };

  return (
    <fieldset className="flex flex-col gap-4" aria-describedby={error ? errorId : undefined}>
      <legend className="meal-field-label">食品群・栄養観点 <span aria-hidden="true">*</span></legend>
      <p className="-mt-2 text-sm text-pencil-gray">当てはまるものをすべて選んでください。</p>
      <div className="flex flex-col gap-3">
        {MEAL_FOOD_GROUPS.map((group) => (
          <div key={group.category}>
            <p className="mb-2 text-sm font-bold text-charcoal">{group.category}</p>
            <div className="flex flex-wrap gap-2">
              {group.items.map((foodGroup) => {
                const isSelected = value.includes(foodGroup.value);
                return <label key={foodGroup.value} className={`meal-tag-chip ${isSelected ? "meal-tag-chip-selected" : ""}`}>
                  <input type="checkbox" name="food-groups" value={foodGroup.value} checked={isSelected} onChange={() => toggle(foodGroup.value)} className="peer sr-only" />
                  {foodGroup.label}{isSelected ? <Check aria-label="選択中" className="ml-1 size-3.5" strokeWidth={3} /> : null}
                </label>;
              })}
            </div>
          </div>
        ))}
      </div>
      {error ? <p id={errorId} className="text-sm text-red-600">{error}</p> : null}
    </fieldset>
  );
}
