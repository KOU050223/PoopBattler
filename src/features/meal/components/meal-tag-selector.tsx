"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";

import { MEAL_TAGS, type MealTag } from "@/features/meal/meal.types";

type MealTagSelectorProps = {
  value: MealTag | "";
  onChange: (tag: MealTag) => void;
  error?: string;
  errorId: string;
};

/** 食事タグの選択。選んだ項目だけを軽く持ち上げて選択結果を分かりやすくする。 */
export function MealTagSelector({ value, onChange, error, errorId }: MealTagSelectorProps) {
  const reduceMotion = useReducedMotion();
  return (
    <fieldset className="flex flex-col gap-3" aria-describedby={error ? errorId : undefined}>
      <legend className="meal-field-label">食事タグ <span aria-hidden="true">*</span></legend>
      <div className="flex flex-wrap gap-2">
        {MEAL_TAGS.map((mealTag) => {
          const isSelected = value === mealTag.value;

          return (
            <motion.label
              key={mealTag.value}
              animate={reduceMotion ? undefined : { scale: isSelected ? 1.02 : 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className={`meal-tag-chip ${isSelected ? "meal-tag-chip-selected" : ""}`}
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
              {isSelected && <Check aria-label="選択中" className="ml-1 size-3.5" strokeWidth={3} />}
            </motion.label>
          );
        })}
      </div>
      {error && <p id={errorId} className="text-sm text-red-600">{error}</p>}
    </fieldset>
  );
}
