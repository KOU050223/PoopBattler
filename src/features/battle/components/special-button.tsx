"use client";

import { useSpecialMotion } from "@/features/battle/hooks/use-special-motion";

export function SpecialButton() {
  const { reason, activateSpecial } = useSpecialMotion();

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={activateSpecial}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        必殺
      </button>
      {reason ? (
        <p role="status" className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          {reason}
        </p>
      ) : null}
    </div>
  );
}
