import { describe, expect, it } from "vitest";

import {
  installPromotionKind,
  isIosSafari,
} from "./pwa-install";

describe("installPromotionKind", () => {
  it("初回の完了後、インストール可能な Chromium では追加ボタンを出す", () => {
    expect(
      installPromotionKind({
        hasNativePrompt: true,
        isInstalled: false,
        isIosSafari: false,
        isChromium: true,
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
        isChromium: false,
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
        isChromium: true,
        hasAlreadyShown: false,
      }),
    ).toBeNull();
    expect(
      installPromotionKind({
        hasNativePrompt: true,
        isInstalled: false,
        isIosSafari: false,
        isChromium: true,
        hasAlreadyShown: true,
      }),
    ).toBeNull();
    expect(
      installPromotionKind({
        hasNativePrompt: false,
        isInstalled: false,
        isIosSafari: false,
        isChromium: false,
        hasAlreadyShown: false,
      }),
    ).toBeNull();
  });

  it("導入イベント前のChromiumにはメニューからの追加手順を出す", () => {
    expect(installPromotionKind({
      hasNativePrompt: false,
      isInstalled: false,
      isIosSafari: false,
      isChromium: true,
      hasAlreadyShown: false,
    })).toBe("chromium-instructions");
  });
});

describe("isIosSafari", () => {
  it("iPadOSのdesktop UAでもタッチ対応ならSafariとして扱う", () => {
    expect(isIosSafari("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "Apple Computer, Inc.", 5)).toBe(true);
    expect(isIosSafari("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "Apple Computer, Inc.", 0)).toBe(false);
  });
});
