import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../../../messages/ja.json";
import type { AccountStatus } from "@/features/account/account.types";

import { TeaserReport } from "./teaser-report";

const linkedAccount: AccountStatus = {
  signedIn: true,
  isAnonymous: false,
  hasGoogleIdentity: true,
  email: "user@example.com",
};

const anonymousAccount: AccountStatus = {
  signedIn: true,
  isAnonymous: true,
  hasGoogleIdentity: false,
  email: null,
};

function render(
  teaser: { bowelCount: number; recordedDays: number },
  account: AccountStatus,
  hasSubscription = false,
) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="ja" messages={messages}>
      <TeaserReport teaser={teaser} account={account} hasSubscription={hasSubscription} />
    </NextIntlClientProvider>,
  );
}

describe("TeaserReport", () => {
  it("無料枠の件数と記録日数はぼかさずに表示する", () => {
    const markup = render({ bowelCount: 3, recordedDays: 2 }, linkedAccount);

    expect(markup).toContain("今週は3件記録しました");
    expect(markup).toContain("2日分の記録があります");
  });

  it("見本であることを、ぼかしの外の読める位置に示す", () => {
    const markup = render({ bowelCount: 3, recordedDays: 2 }, linkedAccount);

    expect(markup).toContain("表示は見本です");
  });

  // この機能の肝。ぼかしはCSSでしかないため、実データを渡す作りにすると
  // スタイルを消すだけで読めてしまう。TeaserReport が受け取れる型に
  // 分析値の場所が無いことを、レンダー結果からも固定しておく。
  it("実際の分析値を一切描画しない", () => {
    const markup = render({ bowelCount: 3, recordedDays: 2 }, linkedAccount);

    // 分析セクションの実データ由来の値（平均の硬さ・食事タグ名など）が出ないこと。
    expect(markup).not.toContain("野菜");
    expect(markup).not.toContain("もっとも記録が多い曜日");
    expect(markup).not.toContain("食事との記録上の関連");
  });

  it("連携済みのユーザーには購入への導線を出す", () => {
    const markup = render({ bowelCount: 3, recordedDays: 2 }, linkedAccount);

    expect(markup).toContain("プレミアムを購入する");
    expect(markup).not.toContain("Googleアカウントを連携する");
  });

  // 匿名のまま購入させると、端末を変えた時点で権利が復元できなくなる。
  it("匿名ユーザーには購入ではなく連携への導線を出す", () => {
    const markup = render({ bowelCount: 3, recordedDays: 2 }, anonymousAccount);

    expect(markup).toContain("Googleアカウントを連携する");
    expect(markup).not.toContain("プレミアムを購入する");
  });

  // 支払いに失敗して past_due になった人は、購入し直すのではなく
  // 支払い方法を直す必要がある。導線が無いとStripeへ辿り着けない。
  it("購読はあるが権利が無い人には支払い方法の管理へ導線を出す", () => {
    const markup = render({ bowelCount: 3, recordedDays: 2 }, linkedAccount, true);

    expect(markup).toContain("購読を管理する");
  });

  it("購読が無い人には管理の導線を出さない", () => {
    const markup = render({ bowelCount: 3, recordedDays: 2 }, linkedAccount, false);

    expect(markup).not.toContain("購読を管理する");
  });

  it("記録が0件でもレポートの形を見せる", () => {
    const markup = render({ bowelCount: 0, recordedDays: 0 }, linkedAccount);

    expect(markup).toContain("今週は0件記録しました");
    expect(markup).toContain("表示は見本です");
  });
});
