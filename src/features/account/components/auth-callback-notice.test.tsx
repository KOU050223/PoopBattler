import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AuthCallbackNotice } from "./auth-callback-notice";

describe("AuthCallbackNotice", () => {
  it("コールバックを経ていない場合は何も出さない", () => {
    expect(
      renderToStaticMarkup(<AuthCallbackNotice linked={false} errorCode={null} />),
    ).toBe("");
  });

  it("連携成功を伝える", () => {
    expect(
      renderToStaticMarkup(<AuthCallbackNotice linked errorCode={null} />),
    ).toContain("Googleアカウントとの連携が完了しました。");
  });

  it("衝突は統合しない旨とともに伝える", () => {
    expect(
      renderToStaticMarkup(
        <AuthCallbackNotice linked={false} errorCode="identity_already_exists" />,
      ),
    ).toContain("既に別のアカウントで使われています");
  });

  it("未知のエラーコードでも黙って消さず既定の文言を出す", () => {
    expect(
      renderToStaticMarkup(<AuthCallbackNotice linked={false} errorCode="unknown_code" />),
    ).toContain("Googleとの連携に失敗しました");
  });

  // errorCode はクエリ文字列由来なので、プロトタイプ継承のキーが渡りうる。
  // 通常のオブジェクトで引くと `__proto__` は Object を返し、React が
  // レンダーできずホーム画面全体がエラーになる。
  it("プロトタイプ継承のキーでも既定の文言へ落ちる", () => {
    for (const hostile of ["__proto__", "toString", "constructor", "valueOf"]) {
      const markup = renderToStaticMarkup(
        <AuthCallbackNotice linked={false} errorCode={hostile} />,
      );

      expect(markup).toContain("Googleとの連携に失敗しました");
    }
  });

  it("エラーは成功の表示より優先する", () => {
    const markup = renderToStaticMarkup(
      <AuthCallbackNotice linked errorCode="access_denied" />,
    );

    expect(markup).toContain("キャンセルされました");
    expect(markup).not.toContain("連携が完了しました");
  });
});
