"use client";

import { Download } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import {
  installPromotionKind,
  PWA_INSTALL_PROMOTION_STORAGE_KEY,
  type InstallPromotionKind,
} from "@/features/pwa/pwa-install";
import { cardClass, mutedTextClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui-classes";

import { usePwaInstall } from "./pwa-install-provider";

function subscribeToPromotionStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function hasShownPromotion() {
  return window.localStorage.getItem(PWA_INSTALL_PROMOTION_STORAGE_KEY) === "true";
}

/** 初回バトルの記録完了後だけに置く、控えめなホーム画面追加案内。 */
export function PwaInstallPromotion() {
  const { deferredPrompt, isInstalled, isIosSafari, requestInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);
  const hasAlreadyShown = useSyncExternalStore(
    subscribeToPromotionStorage,
    hasShownPromotion,
    () => true,
  );

  const kind = installPromotionKind({
    hasNativePrompt: deferredPrompt !== null,
    isInstalled,
    isIosSafari,
    hasAlreadyShown,
  });

  function dismiss() {
    window.localStorage.setItem(PWA_INSTALL_PROMOTION_STORAGE_KEY, "true");
    setDismissed(true);
  }

  async function install() {
    window.localStorage.setItem(PWA_INSTALL_PROMOTION_STORAGE_KEY, "true");
    await requestInstall();
    setDismissed(true);
  }

  if (!kind || dismissed) return null;

  return <InstallPromotionCard kind={kind} onDismiss={dismiss} onInstall={() => void install()} />;
}

export function InstallPromotionCard({
  kind,
  onDismiss,
  onInstall,
}: {
  kind: InstallPromotionKind;
  onDismiss: () => void;
  onInstall: () => void;
}) {
  const isNative = kind === "native";

  return (
    <aside className={`w-full text-left ${cardClass}`} aria-labelledby="pwa-install-title">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blush-wash text-flush-edge">
          <Download className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 id="pwa-install-title" className="text-[19px] font-bold leading-[1.4] text-charcoal">
            次のバトルを、すぐ始めよう
          </h2>
          <p className={`mt-1 ${mutedTextClass}`}>
            ホーム画面に追加すると、アプリのようにすぐ開けます。
          </p>
        </div>
      </div>

      {isNative ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className={primaryButtonClass} onClick={onInstall}>
            ホーム画面に追加
          </button>
          <button type="button" className={secondaryButtonClass} onClick={onDismiss}>
            あとで
          </button>
        </div>
      ) : (
        <>
          <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm font-medium leading-6 text-pencil-gray">
            <li>画面下の共有ボタンを押す</li>
            <li>「ホーム画面に追加」を選ぶ</li>
            <li>右上の「追加」を押す</li>
          </ol>
          <button type="button" className={`mt-4 ${secondaryButtonClass}`} onClick={onDismiss}>
            あとで
          </button>
        </>
      )}
    </aside>
  );
}
