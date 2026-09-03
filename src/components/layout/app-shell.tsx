import type { ReactNode } from "react";

import { BottomNavigation } from "./bottom-navigation";

/**
 * ボトムナビゲーションを備えた画面枠。
 * ナビは fixed なので、本文には同じ高さぶんの余白を確保して重なりを防ぐ。
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-blush-wash">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pt-6 pb-[calc(4.5rem+1.75rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <BottomNavigation />
    </div>
  );
}
