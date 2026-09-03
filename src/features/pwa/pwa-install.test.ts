import { describe, expect, it } from "vitest";

import {
  installPromotionKind,
  isFirstCompletedBattle,
  isIosSafari,
  shouldRememberInstallPromotionEligibility,
} from "./pwa-install";

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

describe("isFirstCompletedBattle", () => {
  it("確定済みバトルが1件のときだけ、初回完了として扱う", () => {
    expect(isFirstCompletedBattle(1)).toBe(true);
    expect(isFirstCompletedBattle(0)).toBe(false);
    expect(isFirstCompletedBattle(2)).toBe(false);
  });
});

describe("isIosSafari", () => {
  it("iPadOSのdesktop UAでもタッチ対応ならSafariとして扱う", () => {
    expect(isIosSafari("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "Apple Computer, Inc.", 5)).toBe(true);
    expect(isIosSafari("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "Apple Computer, Inc.", 0)).toBe(false);
  });
});

describe("shouldRememberInstallPromotionEligibility", () => {
  it("初回完了後は導入イベントが遅れても案内資格を保持する", () => {
    expect(shouldRememberInstallPromotionEligibility(true, false)).toBe(true);
    expect(shouldRememberInstallPromotionEligibility(false, true)).toBe(true);
    expect(shouldRememberInstallPromotionEligibility(false, false)).toBe(false);
  });
});
