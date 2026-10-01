import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SIGNED_OUT_ACCOUNT_STATUS } from "../account.types";
import { DeleteAccountSection } from "./delete-account-section";

const signedIn = {
  signedIn: true,
  isAnonymous: false,
  hasGoogleIdentity: true,
  email: "user@example.com",
};

describe("DeleteAccountSection", () => {
  it("未サインインでは何も出さない", () => {
    expect(
      renderToStaticMarkup(<DeleteAccountSection status={SIGNED_OUT_ACCOUNT_STATUS} />),
    ).toBe("");
  });

  // 取り消せない操作なので、入口だけでなく「消えるもの」と
  // 「戻せないこと」を同じ画面で明示する。
  it("削除対象と取り消せないことを明示してから確認へ進ませる", () => {
    const markup = renderToStaticMarkup(<DeleteAccountSection status={signedIn} />);

    expect(markup).toContain("食事・排便・バトルの記録");
    expect(markup).toContain("取り消せません");
    expect(markup).toContain("退会する");
    // 確認段階の文言は1段目では出さない。
    expect(markup).not.toContain("本当に削除しますか");
  });

  it("匿名ユーザーにも出す", () => {
    const markup = renderToStaticMarkup(
      <DeleteAccountSection
        status={{ ...signedIn, isAnonymous: true, hasGoogleIdentity: false, email: null }}
      />,
    );

    expect(markup).toContain("退会する");
  });
});
