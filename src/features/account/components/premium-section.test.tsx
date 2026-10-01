import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SIGNED_OUT_ACCOUNT_STATUS } from "../account.types";
import { PremiumSection } from "./premium-section";

const signedIn = {
  signedIn: true,
  isAnonymous: false,
  hasGoogleIdentity: true,
  email: "user@example.com",
};

describe("PremiumSection", () => {
  it("購読中の利用者に解約への導線を出す", () => {
    const markup = renderToStaticMarkup(
      <PremiumSection status={signedIn} subscription="subscribed" />,
    );

    expect(markup).toContain("プレミアムを管理・解約する");
    // 解約とアカウント削除を混同させないため、記録が残ることを明示する。
    expect(markup).toContain("アカウントや記録は残ります");
  });

  it("購読していない利用者には何も出さない", () => {
    expect(
      renderToStaticMarkup(
        <PremiumSection status={signedIn} subscription="not-subscribed" />,
      ),
    ).toBe("");
  });

  it("未サインインでは何も出さない", () => {
    expect(
      renderToStaticMarkup(
        <PremiumSection status={SIGNED_OUT_ACCOUNT_STATUS} subscription="subscribed" />,
      ),
    ).toBe("");
  });

  // 読み取りに失敗した状態を「未購読」と見せると、購読中なのに
  // 解約導線がない画面になる。
  it("購読状態が不明なときは何も出さない", () => {
    expect(
      renderToStaticMarkup(
        <PremiumSection status={signedIn} subscription="unknown" />,
      ),
    ).toBe("");
  });
});
