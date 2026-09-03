import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";

import messages from "../../messages/ja.json";
import { defaultLocale, isSupportedLocale, locales } from "./config";
import { resolveLocale } from "./resolve-locale";

// `getRequestConfig` 自体は Server Component 専用 API のため vitest からは
// 直接呼べない（クライアント向け実装に解決されて落ちる）。
// そこで request.ts が実際に使うロケール決定ロジックを純関数として切り出し、
// そこを検証している。カタログの読み込みは build で通ることを確認済み。
describe("ロケール決定（request.ts が使う実装）", () => {
  it("Cookie が無いときは既定ロケールになる", () => {
    expect(resolveLocale(undefined)).toBe(defaultLocale);
  });

  it("サポート対象のロケールはそのまま採用される", () => {
    for (const locale of locales) {
      expect(resolveLocale(locale)).toBe(locale);
    }
  });

  // Cookie は利用者が任意の値に書き換えられるため、
  // 許可リストに無い値が素通りしないことを固定しておく。
  it("サポート外のロケールは既定へフォールバックする", () => {
    expect(resolveLocale("xx")).toBe(defaultLocale);
    expect(resolveLocale("../../etc/passwd")).toBe(defaultLocale);
  });
});

// messages/<locale>.json を足すだけでは言語は有効にならない。
// config.ts の locales への追加を忘れると無言でフォールバックするため、
// その前提をテストで明示しておく。
describe("ロケール許可リスト", () => {
  it("locales に含まれる値だけを受け入れる", () => {
    for (const locale of locales) {
      expect(isSupportedLocale(locale)).toBe(true);
    }
    expect(isSupportedLocale("xx")).toBe(false);
    expect(isSupportedLocale(undefined)).toBe(false);
  });
});

describe("メッセージカタログ", () => {
  const t = createTranslator({ locale: "ja", messages, onError: () => {} });

  it("存在するキーは日本語の文言を返す", () => {
    expect(t("Common.appName")).toBe("踏ん張れ！ブリュレイド！！");
  });

  it("存在しないキーは空文字ではなくキー名を返す", () => {
    // @ts-expect-error 存在しないキーを意図的に指定している
    expect(t("Common.doesNotExist")).toBe("Common.doesNotExist");
  });
});
