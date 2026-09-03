"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { LOCALE_COOKIE, locales, type Locale } from "@/i18n/config";

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const t = useTranslations("Common");

  function changeLocale(nextLocale: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    router.refresh();
  }

  return (
    <label>
      <span className="sr-only">{t("language")}</span>
      <select
        value={locale}
        onChange={(event) => changeLocale(event.target.value as Locale)}
        className="min-h-11 rounded-lg border border-faded-gray bg-paper-white px-2 text-sm font-bold text-charcoal"
      >
        {locales.map((supportedLocale) => (
          <option key={supportedLocale} value={supportedLocale}>
            {supportedLocale === "ja" ? "日本語" : "English"}
          </option>
        ))}
      </select>
    </label>
  );
}
