export const PWA_INSTALL_PROMOTION_STORAGE_KEY = "poop-battler:pwa-install-promotion-shown";
export const PWA_INSTALL_PROMOTION_ELIGIBLE_STORAGE_KEY = "poop-battler:pwa-install-promotion-eligible";

export type InstallPromotionKind = "native" | "ios-instructions" | "chromium-instructions";

type InstallPromotionConditions = {
  hasNativePrompt: boolean;
  isInstalled: boolean;
  isIosSafari: boolean;
  isChromium: boolean;
  hasAlreadyShown: boolean;
};

/** 初回のバトル完了後に出せる、端末ごとの案内種別を決める。 */
export function installPromotionKind({
  hasNativePrompt,
  isInstalled,
  isIosSafari,
  isChromium,
  hasAlreadyShown,
}: InstallPromotionConditions): InstallPromotionKind | null {
  if (isInstalled || hasAlreadyShown) return null;
  if (hasNativePrompt) return "native";
  if (isIosSafari) return "ios-instructions";
  if (isChromium) return "chromium-instructions";
  return null;
}

export function isChromiumBrowser(userAgent: string) {
  return /Chrome|Chromium|CriOS|Edg\//.test(userAgent) && !/OPR\//.test(userAgent);
}

export function isIosSafari(userAgent: string, vendor: string, maxTouchPoints = 0) {
  const isIPadOsDesktopUa = /Macintosh/.test(userAgent) && maxTouchPoints > 1;
  const isIos = /iPad|iPhone|iPod/.test(userAgent) || isIPadOsDesktopUa;
  const isOtherIosBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
  return isIos && vendor.includes("Apple") && !isOtherIosBrowser;
}
