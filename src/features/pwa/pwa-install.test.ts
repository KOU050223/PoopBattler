import { describe, expect, it } from "vitest";

import { installPromotionKind } from "./pwa-install";

describe("installPromotionKind", () => {
  it("初回の完了後、インストール可能な Chromium では追加ボタンを出す", () => {
    expect(
      installPromotionKind({
        hasNativePrompt: true,
        isInstalled: false,
        isIosSafari: false,
        hasAlreadyShown: false,
      }),
    ).toBe("native");
  });

  it("iOS Safari では共有メニューの手順を出す", () => {
    expect(
      installPromotionKind({
        hasNativePrompt: false,
        isInstalled: false,
        isIosSafari: true,
        hasAlreadyShown: false,
      }),
    ).toBe("ios-instructions");
  });

  it("導入済み・表示済み・未対応ブラウザには案内を出さない", () => {
    expect(
      installPromotionKind({
        hasNativePrompt: true,
        isInstalled: true,
        isIosSafari: false,
        hasAlreadyShown: false,
      }),
    ).toBeNull();
    expect(
      installPromotionKind({
        hasNativePrompt: true,
        isInstalled: false,
        isIosSafari: false,
        hasAlreadyShown: true,
      }),
    ).toBeNull();
    expect(
      installPromotionKind({
        hasNativePrompt: false,
        isInstalled: false,
        isIosSafari: false,
        hasAlreadyShown: false,
      }),
    ).toBeNull();
  });
});
