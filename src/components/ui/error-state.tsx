import { mutedTextClass, primaryButtonClass } from "@/lib/ui-classes";

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

/** 汎用エラー表示。再試行の実処理は呼び出し側が渡す。 */
export function ErrorState({
  title = "問題が発生しました",
  description = "時間をおいて再試行してください。",
  onRetry,
  retryLabel = "再試行する",
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-2xl border-2 border-faded-gray bg-paper-white px-6 py-12 text-center shadow-raised-gray"
    >
      <p className="font-bold text-charcoal">{title}</p>
      <p className={mutedTextClass}>{description}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={primaryButtonClass}>
          {retryLabel}
        </button>
      )}
    </div>
  );
}
