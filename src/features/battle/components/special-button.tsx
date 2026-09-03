"use client";

import { useSpecialMotion } from "@/features/battle/hooks/use-special-motion";
import { captionTextClass, specialButtonClass } from "@/lib/ui-classes";

export function SpecialButton() {
  const { reason, activateSpecial } = useSpecialMotion();

  return (
    <div className="flex flex-col items-center gap-2">
      <button type="button" onClick={activateSpecial} className={specialButtonClass}>
        必殺
      </button>
      {reason ? (
        <p role="status" className={`text-center ${captionTextClass}`}>
          {reason}
        </p>
      ) : null}
    </div>
  );
}
