import type { ReactNode } from "react";

import { mutedTextClass } from "@/lib/ui-classes";

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
    <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-faded-gray bg-paper-white px-6 py-12 text-center">
      <p className="font-bold text-charcoal">{title}</p>
      {description && <p className={mutedTextClass}>{description}</p>}
      {action}
    </div>
  );
}
