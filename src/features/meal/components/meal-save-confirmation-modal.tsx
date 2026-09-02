"use client";

import { AnimatePresence, motion } from "framer-motion";

import { MEAL_TAGS, type MealTag } from "@/features/meal/meal.types";

type MealSaveConfirmationModalProps = {
  isOpen: boolean;
  tag: MealTag;
  isSaving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/** 保存前の確認を、現在のスクロール位置に依存しない中央モーダルで表示する。 */
export function MealSaveConfirmationModal({
  isOpen,
  tag,
  isSaving,
  onCancel,
  onConfirm,
}: MealSaveConfirmationModalProps) {
  const tagLabel = MEAL_TAGS.find((mealTag) => mealTag.value === tag)?.label;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="meal-confirmation-title"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="w-full max-w-sm rounded-lg border border-zinc-300 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-black"
          >
            <h2 id="meal-confirmation-title" className="font-semibold">この内容で保存しますか？</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{tagLabel}として記録します。</p>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={onCancel} disabled={isSaving} className="min-h-11 rounded-md border border-zinc-300 px-4 dark:border-zinc-700">戻る</button>
              <button type="button" onClick={onConfirm} disabled={isSaving} className="min-h-11 rounded-md bg-zinc-900 px-4 font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-black">{isSaving ? "保存中…" : "保存する"}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
