import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

/**
 * データが 0 件のときの共通表示。
 * 文言は必ず呼び出し側から渡し、機能固有の内容をここへ持ち込まない。
 */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
      <p className="font-medium text-zinc-900 dark:text-zinc-100">{title}</p>
      {description && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      )}
      {action}
    </div>
  );
}
