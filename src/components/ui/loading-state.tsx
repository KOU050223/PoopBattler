import { captionTextClass } from "@/lib/ui-classes";

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
        className="size-6 animate-spin rounded-full border-2 border-blush-wash border-t-flush-pink"
      />
      <p className={captionTextClass}>{label}</p>
    </div>
  );
}
