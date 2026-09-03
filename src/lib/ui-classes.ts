/** DESIGN.md のシール型コントロール。 */

export const primaryButtonClass =
  "min-h-11 rounded-xl bg-flush-pink px-4 text-[15px] font-bold text-paper-white disabled:opacity-50";

export const secondaryButtonClass =
  "min-h-11 rounded-xl border-2 border-faded-gray px-4 text-sm font-bold text-spark-blue disabled:opacity-50";

export const specialButtonClass =
  "min-h-11 rounded-xl bg-night-ink px-4 text-[15px] font-bold text-paper-white disabled:opacity-50";

export const dangerButtonClass =
  "min-h-11 rounded-xl border-2 border-red-300 px-4 text-sm font-bold text-red-700 disabled:opacity-50";

export const cardClass =
  "rounded-xl border-2 border-faded-gray bg-paper-white p-4";

export const fieldClass =
  "min-h-11 rounded-xl border-2 border-faded-gray bg-paper-white px-3 text-charcoal";

export const mutedTextClass = "text-[17px] font-medium leading-[1.18] text-pencil-gray";

export const captionTextClass = "text-[13px] font-medium leading-[1.23] text-pencil-gray";

export function stancePillClass(active: boolean, disabled: boolean) {
  if (disabled) {
    return "min-h-11 rounded-xl border-2 border-faded-gray px-3 py-2 text-sm font-bold text-faded-gray";
  }
  if (active) {
    return "min-h-11 rounded-xl bg-flush-pink px-3 py-2 text-sm font-bold text-paper-white";
  }
  return "min-h-11 rounded-xl border-2 border-faded-gray bg-paper-white px-3 py-2 text-sm font-bold text-charcoal";
}
