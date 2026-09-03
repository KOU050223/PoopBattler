import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SIGNED_OUT_ACCOUNT_STATUS } from "../account.types";
import { HeaderAccountStatus } from "./header-account-status";

// 実物の AccountMenu は useRouter を使うクライアント専用の部品なので、
// ここでは「連携済みのときだけスロットが出る」ことを見る目印を渡す。
const MENU = <span>MENU_SLOT</span>;

describe("HeaderAccountStatus", () => {
  it("状態が確定するまではログインの有無を断定しない", () => {
    const markup = renderToStaticMarkup(
      <HeaderAccountStatus status={null} menu={MENU} />,
    );

    expect(markup).not.toContain("ログイン");
    expect(markup).not.toContain("MENU_SLOT");
  });

  it("未サインインならログインへの誘導を出し、メニューは出さない", () => {
    const markup = renderToStaticMarkup(
      <HeaderAccountStatus status={SIGNED_OUT_ACCOUNT_STATUS} menu={MENU} />,
    );

    expect(markup).toContain("ログイン");
    expect(markup).toContain('href="/account"');
    expect(markup).not.toContain("MENU_SLOT");
  });

  it("匿名のままならログインへの誘導を出し、メニューは出さない", () => {
    // 匿名はブラウザのデータを消すと戻れないアカウントで、
    // GoogleAccountLink もそれを警告している。ここで「ログイン済み」に
    // 見せると同じ画面で表示が矛盾する。
    const markup = renderToStaticMarkup(
      <HeaderAccountStatus
        status={{
          signedIn: true,
          isAnonymous: true,
          hasGoogleIdentity: false,
          email: null,
        }}
        menu={MENU}
      />,
    );

    expect(markup).toContain("ログイン");
    expect(markup).not.toContain("MENU_SLOT");
  });

  it("Google連携済みならメニューを出し、誘導は出さない", () => {
    const markup = renderToStaticMarkup(
      <HeaderAccountStatus
        status={{
          signedIn: true,
          isAnonymous: false,
          hasGoogleIdentity: true,
          email: "player@example.com",
        }}
        menu={MENU}
      />,
    );

    expect(markup).toContain("MENU_SLOT");
    expect(markup).not.toContain(">ログイン<");
  });

  it("誘導からは OAuth を直接開始せず、確認手順のある画面へ送る", () => {
    // 別端末での「ログイン」は匿名データを捨てる破壊的な操作になり得るため、
    // ヘッダーにボタンを置かず AccountSection の確認手順へ集約する。
    const markup = renderToStaticMarkup(
      <HeaderAccountStatus status={SIGNED_OUT_ACCOUNT_STATUS} menu={MENU} />,
    );

    expect(markup).not.toContain("<button");
  });
});
