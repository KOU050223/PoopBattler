import type { Locale } from "next-intl";

/**
 * 対応ロケール。言語を追加するときは、この配列に追加して
 * `messages/<locale>.json` を用意すれば足りる（コード側の変更は不要）。
 */
export const locales = ["ja"] as const satisfies readonly Locale[];

export const defaultLocale: Locale = "ja";

/** ロケールを保存する Cookie 名。 */
export const LOCALE_COOKIE = "locale";

export function isSupportedLocale(value: string | undefined): value is Locale {
  return value !== undefined && (locales as readonly string[]).includes(value);
}
