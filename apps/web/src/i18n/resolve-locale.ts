import type { Locale } from "next-intl";

import { defaultLocale, isSupportedLocale } from "./config";

/**
 * Cookie の値から利用するロケールを決める。
 *
 * Cookie は利用者側で任意の値に書き換えられるため、許可リストに無い値は
 * 既定ロケールへフォールバックさせる。言語を追加するときは
 * `src/i18n/config.ts` の `locales` にも追加する必要がある
 * （翻訳ファイルを置くだけでは有効にならない）。
 */
export function resolveLocale(cookieValue: string | undefined): Locale {
  return isSupportedLocale(cookieValue) ? cookieValue : defaultLocale;
}
