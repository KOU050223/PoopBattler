"use client";

import { motion } from "framer-motion";

import { MEAL_TAGS, type MealTag } from "@/features/meal/meal.types";
import { stancePillClass } from "@/lib/ui-classes";

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
      <legend className="font-bold text-charcoal">食事タグ <span aria-hidden="true">*</span></legend>
      <div className="grid grid-cols-2 gap-3">
        {MEAL_TAGS.map((mealTag) => {
          const isSelected = value === mealTag.value;

          return (
            <motion.label
              key={mealTag.value}
              animate={{ scale: isSelected ? 1.02 : 1, y: isSelected ? -1 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className={`flex cursor-pointer items-center justify-center focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-flush-pink ${stancePillClass(isSelected, false)}`}
            >
              <input
                type="radio"
                name="meal-tag"
                value={mealTag.value}
                checked={isSelected}
                onChange={() => onChange(mealTag.value)}
                className="peer sr-only"
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
