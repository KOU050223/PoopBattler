import { describe, expect, it } from "vitest";

import { readAuthErrorCode, readAuthLinked } from "./callback-params";

describe("readAuthErrorCode", () => {
  it("コールバックを経ていない場合はエラーなしとして扱う", () => {
    expect(readAuthErrorCode({})).toBeNull();
  });

  it("`/auth/callback` が正規化した auth_error を読む", () => {
    expect(readAuthErrorCode({ auth_error: "access_denied" })).toBe("access_denied");
  });

  // 本番で観測した形。redirectTo が Redirect URLs に一致せず、GoTrue が
  // Site URL へ直接戻したため `/auth/callback` を経ず素の名前で載った。
  // これを読めないと、エラーなのに「準備ができました」だけが出る。
  it("Supabaseが直接返す error_code を読む", () => {
    expect(
      readAuthErrorCode({
        error: "server_error",
        error_code: "identity_already_exists",
        error_description: "Identity is already linked to another user",
      }),
    ).toBe("identity_already_exists");
  });

  it("error_code が無ければ error に落ちる", () => {
    expect(readAuthErrorCode({ error: "server_error" })).toBe("server_error");
  });

  it("正規化済みの値を素の値より優先する", () => {
    expect(
      readAuthErrorCode({ auth_error: "exchange_failed", error_code: "server_error" }),
    ).toBe("exchange_failed");
  });

  it("同じキーが複数ある場合は先頭を読む", () => {
    expect(readAuthErrorCode({ error_code: ["identity_already_exists", "x"] })).toBe(
      "identity_already_exists",
    );
  });
});

describe("readAuthLinked", () => {
  it("実際に連携済みなら成功を出す", () => {
    expect(readAuthLinked({ auth_linked: "1" }, true)).toBe(true);
  });

  // 履歴や共有から `?auth_linked=1` に再訪しても、匿名のままなら
  // 「記録は復旧できる」と誤って伝えてはいけない。
  it("URLだけで連携済みを主張しない", () => {
    expect(readAuthLinked({ auth_linked: "1" }, false)).toBe(false);
  });

  it("パラメータが無ければ成功を出さない", () => {
    expect(readAuthLinked({}, true)).toBe(false);
  });
});
