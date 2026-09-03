"use client";

import { useTranslations } from "next-intl";

import { mutedTextClass, primaryButtonClass } from "@/lib/ui-classes";

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

/** 汎用エラー表示。再試行の実処理は呼び出し側が渡す。 */
export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel,
}: ErrorStateProps) {
  const t = useTranslations("Common");

  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-2xl border-2 border-faded-gray bg-paper-white px-6 py-12 text-center shadow-raised-gray"
    >
      <p className="font-bold text-charcoal">{title ?? t("errorTitle")}</p>
      <p className={mutedTextClass}>{description ?? t("errorDescription")}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={primaryButtonClass}>
          {retryLabel ?? t("retry")}
        </button>
      )}
    </div>
  );
}
