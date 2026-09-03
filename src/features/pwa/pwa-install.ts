export const PWA_INSTALL_PROMOTION_STORAGE_KEY = "poop-battler:pwa-install-promotion-shown";

export type InstallPromotionKind = "native" | "ios-instructions";

type InstallPromotionConditions = {
  hasNativePrompt: boolean;
  isInstalled: boolean;
  isIosSafari: boolean;
  hasAlreadyShown: boolean;
};

/** 初回のバトル完了後に出せる、端末ごとの案内種別を決める。 */
export function installPromotionKind({
  hasNativePrompt,
  isInstalled,
  isIosSafari,
  hasAlreadyShown,
}: InstallPromotionConditions): InstallPromotionKind | null {
  if (isInstalled || hasAlreadyShown) return null;
  if (hasNativePrompt) return "native";
  if (isIosSafari) return "ios-instructions";
  return null;
}

export function isIosSafari(userAgent: string, vendor: string) {
  const isIos = /iPad|iPhone|iPod/.test(userAgent);
  const isOtherIosBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
  return isIos && vendor.includes("Apple") && !isOtherIosBrowser;
}
