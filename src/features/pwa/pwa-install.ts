export const PWA_INSTALL_PROMOTION_STORAGE_KEY = "poop-battler:pwa-install-promotion-shown";
export const PWA_INSTALL_PROMOTION_ELIGIBLE_STORAGE_KEY = "poop-battler:pwa-install-promotion-eligible";

export type InstallPromotionKind = "native" | "ios-instructions";

/** 確定済みバトルの総数から、今回が初回の完了かを判定する。 */
export function isFirstCompletedBattle(completedBattleCount: number) {
  return completedBattleCount === 1;
}

/** 初回完了済みなら、導入イベントが後から届いても次の結果画面で案内できる。 */
export function shouldRememberInstallPromotionEligibility(
  isFirstCompletedBattle: boolean,
  hasRememberedEligibility: boolean,
) {
  return isFirstCompletedBattle || hasRememberedEligibility;
}

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

export function isIosSafari(userAgent: string, vendor: string, maxTouchPoints = 0) {
  const isIPadOsDesktopUa = /Macintosh/.test(userAgent) && maxTouchPoints > 1;
  const isIos = /iPad|iPhone|iPod/.test(userAgent) || isIPadOsDesktopUa;
  const isOtherIosBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
  return isIos && vendor.includes("Apple") && !isOtherIosBrowser;
}
