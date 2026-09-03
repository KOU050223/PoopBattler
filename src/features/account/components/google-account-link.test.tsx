import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SIGNED_OUT_ACCOUNT_STATUS } from "../account.types";
import { GoogleAccountLink } from "./google-account-link";

describe("GoogleAccountLink", () => {
  it("未サインインでは何も出さない", () => {
    expect(
      renderToStaticMarkup(<GoogleAccountLink status={SIGNED_OUT_ACCOUNT_STATUS} />),
    ).toBe("");
  });

  it("匿名ユーザーには消失の警告と、連携・ログインの両方の導線を出す", () => {
    const markup = renderToStaticMarkup(
      <GoogleAccountLink
        status={{
          signedIn: true,
          isAnonymous: true,
          hasGoogleIdentity: false,
          email: null,
        }}
      />,
    );

    expect(markup).toContain("記録が消える可能性があります");
    expect(markup).toContain("Googleアカウントと連携する");
    // 別端末で既存アカウントへ戻る経路。これが無いと新端末では
    // identity_already_exists に突き当たり、同じデータへ戻れない。
    expect(markup).toContain("既にアカウントをお持ちの方はこちら");
  });

  it("Google以外で昇格済みのユーザーには消失の警告も破壊的な導線も出さない", () => {
    // このユーザーの記録はブラウザのデータを消しても失われない。
    // 警告を出すのは誤りで、「既にアカウントをお持ちの方はこちら」は
    // 今のアカウントを捨てる導線なので、見せること自体が危険。
    const markup = renderToStaticMarkup(
      <GoogleAccountLink
        status={{
          signedIn: true,
          isAnonymous: false,
          hasGoogleIdentity: false,
          email: "player@example.com",
        }}
      />,
    );

    expect(markup).not.toContain("記録が消える可能性があります");
    expect(markup).not.toContain("既にアカウントをお持ちの方はこちら");
  });

  it("連携済みユーザーには昇格の導線も警告も出さない", () => {
    const markup = renderToStaticMarkup(
      <GoogleAccountLink
        status={{
          signedIn: true,
          isAnonymous: false,
          hasGoogleIdentity: true,
          email: "player@example.com",
        }}
      />,
    );

    expect(markup).toContain("Googleアカウントと連携済みです");
    expect(markup).toContain("player@example.com");
    expect(markup).not.toContain("記録が消える可能性があります");
    expect(markup).not.toContain("Googleアカウントと連携する");
  });
});
