type LoadingStateProps = {
  label?: string;
};

/** 読み込み中の共通表示。スクリーンリーダーへも状態を通知する。 */
export function LoadingState({ label = "読み込んでいます…" }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-3 px-6 py-12 text-center"
    >
      <span
        aria-hidden="true"
        className="size-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"
      />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{label}</p>
    </div>
  );
}
