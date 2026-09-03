import { describe, expect, it } from "vitest";

import { SIGNED_OUT_ACCOUNT_STATUS, toAccountStatus } from "./account.types";

describe("toAccountStatus", () => {
  it("未サインインでは昇格の導線を出さない状態を返す", () => {
    expect(toAccountStatus(null)).toEqual(SIGNED_OUT_ACCOUNT_STATUS);
  });

  it("匿名ユーザーは昇格前として扱う", () => {
    expect(
      toAccountStatus({ is_anonymous: true, email: null, identities: [] }),
    ).toEqual({
      signedIn: true,
      isAnonymous: true,
      hasGoogleIdentity: false,
      email: null,
    });
  });

  it("Google連携済みのユーザーはメールアドレスとともに連携済みとして返す", () => {
    expect(
      toAccountStatus({
        is_anonymous: false,
        email: "player@example.com",
        identities: [{ provider: "google" }],
      }),
    ).toEqual({
      signedIn: true,
      isAnonymous: false,
      hasGoogleIdentity: true,
      email: "player@example.com",
    });
  });

  it("Google以外で昇格したユーザーはGoogle未連携として扱う", () => {
    // is_anonymous だけを見ると「昇格済み＝Google連携済み」と誤判定する。
    expect(
      toAccountStatus({
        is_anonymous: false,
        email: "player@example.com",
        identities: [{ provider: "email" }],
      }),
    ).toMatchObject({ isAnonymous: false, hasGoogleIdentity: false });
  });
});
