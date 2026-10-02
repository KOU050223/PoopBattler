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

    expect(markup).toContain("プレミアムを解約する");
    // 解約とアカウント削除を混同させないため、記録が残ることを明示する。
    expect(markup).toContain("記録やアカウントは残り");
    // 確認段階の文言は1段目では出さない。
    expect(markup).not.toContain("プレミアムを解約しますか");
  });

  it("支払い方法や請求履歴は管理ページへの導線を出す", () => {
    const markup = renderToStaticMarkup(
      <PremiumSection status={signedIn} subscription="subscribed" />,
    );

    expect(markup).toContain("支払い方法・請求履歴");
  });

  // 支払いに失敗した人が購入画面に取り残されないよう、管理ページへの
  // 導線だけは出す。権利が無いのに「解約する」は出せない。
  it("支払い失敗（lapsed）の利用者には支払い確認への導線だけを出す", () => {
    const markup = renderToStaticMarkup(
      <PremiumSection status={signedIn} subscription="lapsed" />,
    );

    expect(markup).toContain("お支払いをご確認ください");
    expect(markup).toContain("お支払い情報を確認する");
    expect(markup).not.toContain("プレミアムを解約する");
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
