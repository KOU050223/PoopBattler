"use client";

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { isIosSafari } from "@/features/pwa/pwa-install";

type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type PwaInstallContextValue = {
  deferredPrompt: DeferredInstallPrompt | null;
  isInstalled: boolean;
  isIosSafari: boolean;
  requestInstall: () => Promise<void>;
};

const unavailableInstallContext: PwaInstallContextValue = {
  deferredPrompt: null,
  isInstalled: false,
  isIosSafari: false,
  requestInstall: async () => undefined,
};

// 完了カードは単体プレビューでも使われるため、Provider がないときは案内なしとして扱う。
const PwaInstallContext = createContext<PwaInstallContextValue>(unavailableInstallContext);

function isStandalone() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

const subscribeToNothing = () => () => undefined;

function browserIsIosSafari() {
  return isIosSafari(navigator.userAgent, navigator.vendor);
}

/**
 * beforeinstallprompt は早いタイミングで発火しうるため、アプリ全体で保持する。
 * 画面側はここから状態を読むだけにして、ユーザー操作時にだけ prompt を呼び出す。
 */
export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredInstallPrompt | null>(null);
  const [installedFromEvent, setInstalledFromEvent] = useState(false);
  const isStandaloneApp = useSyncExternalStore(subscribeToNothing, isStandalone, () => false);
  const isIosSafariBrowser = useSyncExternalStore(subscribeToNothing, browserIsIosSafari, () => false);
  const isInstalled = installedFromEvent || isStandaloneApp;

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as DeferredInstallPrompt);
    };
    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setInstalledFromEvent(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const value = useMemo<PwaInstallContextValue>(() => ({
    deferredPrompt,
    isInstalled,
    isIosSafari: isIosSafariBrowser,
    async requestInstall() {
      if (!deferredPrompt) return;
      await deferredPrompt.prompt();
      setDeferredPrompt(null);
    },
  }), [deferredPrompt, isInstalled, isIosSafariBrowser]);

  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>;
}

export function usePwaInstall() {
  return useContext(PwaInstallContext);
}
