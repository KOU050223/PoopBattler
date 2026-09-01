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
      className="flex flex-col items-center gap-3 rounded-lg border border-zinc-300 px-6 py-12 text-center dark:border-zinc-700"
    >
      <p className="font-medium text-zinc-900 dark:text-zinc-100">{title}</p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-black"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
