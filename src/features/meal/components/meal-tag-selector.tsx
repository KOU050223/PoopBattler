"use client";

import { motion } from "framer-motion";

import { MEAL_TAGS, type MealTag } from "@/features/meal/meal.types";

type MealTagSelectorProps = {
  value: MealTag | "";
  onChange: (tag: MealTag) => void;
  error?: string;
  errorId: string;
};

/** 食事タグの選択。選んだ項目だけを軽く持ち上げて選択結果を分かりやすくする。 */
export function MealTagSelector({ value, onChange, error, errorId }: MealTagSelectorProps) {
  return (
    <fieldset className="flex flex-col gap-3" aria-describedby={error ? errorId : undefined}>
      <legend className="font-medium">食事タグ <span aria-hidden="true">*</span></legend>
      <div className="grid grid-cols-2 gap-2">
        {MEAL_TAGS.map((mealTag) => {
          const isSelected = value === mealTag.value;

          return (
            <motion.label
              key={mealTag.value}
              animate={{ scale: isSelected ? 1.02 : 1, y: isSelected ? -1 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-zinc-300 px-3 has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-100 dark:border-zinc-700 dark:has-[:checked]:border-zinc-100 dark:has-[:checked]:bg-zinc-900"
            >
              <input
                type="radio"
                name="meal-tag"
                value={mealTag.value}
                checked={isSelected}
                onChange={() => onChange(mealTag.value)}
              />
              {mealTag.label}
            </motion.label>
          );
        })}
      </div>
      {error && <p id={errorId} className="text-sm text-red-600">{error}</p>}
    </fieldset>
  );
}
