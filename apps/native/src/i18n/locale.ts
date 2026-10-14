// apps/web/src/i18n/config.ts / resolve-locale.ts と同じ許可リストとフォールバック。
export const locales = ["ja", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ja";

export function isSupportedLocale(value: string | undefined | null): value is Locale {
  return value != null && (locales as readonly string[]).includes(value);
}

/** 端末の言語コード（"ja", "en-US" など）から許可リスト内のロケールを決める。 */
export function resolveLocale(languageCode: string | undefined | null): Locale {
  const base = languageCode?.toLowerCase().split(/[-_]/)[0];
  return isSupportedLocale(base) ? base : defaultLocale;
}
