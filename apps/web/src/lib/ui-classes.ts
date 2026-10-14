/** DESIGN.md のシール型コントロール。角丸 + 下方向の硬いオフセット。 */

const raisedPressClass =
  "transition-[transform,box-shadow] duration-75 active:translate-y-1 disabled:active:translate-y-0";

export const primaryButtonClass =
  `min-h-11 rounded-xl bg-flush-pink px-5 text-[15px] font-bold text-paper-white shadow-raised-pink ${raisedPressClass} active:shadow-pressed-pink disabled:opacity-50 disabled:active:shadow-raised-pink`;

export const secondaryButtonClass =
  `min-h-11 rounded-xl border-2 border-faded-gray bg-paper-white px-5 text-sm font-bold text-spark-blue shadow-raised-gray ${raisedPressClass} active:shadow-pressed-gray disabled:opacity-50 disabled:active:shadow-raised-gray`;

export const specialButtonClass =
  `min-h-11 rounded-xl bg-night-ink px-5 text-[15px] font-bold text-paper-white shadow-raised-ink ${raisedPressClass} active:shadow-pressed-ink disabled:opacity-50 disabled:active:shadow-raised-ink`;

export const dangerButtonClass =
  `min-h-11 rounded-xl border-2 border-red-300 bg-paper-white px-5 text-sm font-bold text-red-700 shadow-raised-danger ${raisedPressClass} active:shadow-pressed-danger disabled:opacity-50 disabled:active:shadow-raised-danger`;

export const cardClass =
  "rounded-2xl border-2 border-faded-gray bg-paper-white p-4 shadow-raised-gray";

export const fieldClass =
  "min-h-11 rounded-xl border-2 border-faded-gray bg-paper-white px-4 text-charcoal shadow-raised-gray";

export const navTileClass =
  `flex min-h-14 items-center gap-3 rounded-xl border-2 border-faded-gray bg-paper-white px-5 font-bold text-charcoal shadow-raised-gray ${raisedPressClass} active:shadow-pressed-gray`;

export function navTabClass(isCurrent: boolean) {
  const base =
    "flex min-h-12 w-full flex-col items-center justify-center gap-1 rounded-lg px-1 text-xs font-bold tracking-[0.02em] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flush-pink";

  if (isCurrent) {
    return `${base} bg-blush-wash text-flush-edge`;
  }

  return `${base} text-pencil-gray hover:bg-blush-wash hover:text-charcoal`;
}

export const mutedTextClass = "text-[17px] font-medium leading-[1.18] text-pencil-gray";

export const captionTextClass = "text-[13px] font-medium leading-[1.23] text-pencil-gray";

export function stancePillClass(active: boolean, disabled: boolean) {
  if (disabled) {
    return "min-h-11 rounded-xl border-2 border-faded-gray px-4 py-2 text-sm font-bold text-faded-gray shadow-raised-gray";
  }
  if (active) {
    return `min-h-11 rounded-xl bg-flush-pink px-4 py-2 text-sm font-bold text-paper-white shadow-raised-pink ${raisedPressClass} active:shadow-pressed-pink`;
  }
  return `min-h-11 rounded-xl border-2 border-faded-gray bg-paper-white px-4 py-2 text-sm font-bold text-charcoal shadow-raised-gray ${raisedPressClass} active:shadow-pressed-gray`;
}
