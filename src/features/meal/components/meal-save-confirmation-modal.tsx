"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { MEAL_TAGS, type MealTag } from "@/features/meal/meal.types";
import { mutedTextClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui-classes";

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const tagLabel = MEAL_TAGS.find((mealTag) => mealTag.value === tag)?.label;

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement;
      dialogRef.current?.focus();
      return;
    }

    previouslyFocusedElementRef.current?.focus();
  }, [isOpen]);

  if (typeof document === "undefined") return null;

  return createPortal(
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
            ref={dialogRef}
            tabIndex={-1}
            onKeyDown={(event) => {
              if (event.key === "Escape" && !isSaving) {
                onCancel();
                return;
              }

              if (event.key !== "Tab") return;

              const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
                "button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])",
              );
              if (!focusableElements?.length) return;

              const firstElement = focusableElements[0];
              const lastElement = focusableElements[focusableElements.length - 1];
              if (event.shiftKey && document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
              } else if (!event.shiftKey && document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
              }
            }}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="w-full max-w-sm rounded-2xl border-2 border-faded-gray bg-paper-white p-6 shadow-raised-gray"
          >
            <h2 id="meal-confirmation-title" className="font-bold text-charcoal">この内容で保存しますか？</h2>
            <p className={`mt-2 ${mutedTextClass}`}>{tagLabel}として記録します。</p>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={onCancel} disabled={isSaving} className={secondaryButtonClass}>戻る</button>
              <button type="button" onClick={onConfirm} disabled={isSaving} className={primaryButtonClass}>{isSaving ? "保存中…" : "保存する"}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
