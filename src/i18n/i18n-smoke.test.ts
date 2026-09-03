import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";

import messages from "../../messages/ja.json";

// 陽性: 存在するキーは ja の文言を返す
// 陰性: 存在しないキーは「素通り」せず、キー名にフォールバックしてエラーを報告する
describe("i18n 疎通", () => {
  const t = createTranslator({
    locale: "ja",
    messages,
    onError: () => {},
  });

  it("存在するキーは日本語の文言を返す", () => {
    expect(t("Common.appName")).toBe("うんちバトラー");
  });

  it("存在しないキーは空文字ではなくキー名を返す", () => {
    // @ts-expect-error 存在しないキーを意図的に指定している
    expect(t("Common.doesNotExist")).toBe("Common.doesNotExist");
  });
});
