import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  /** 右上に置く要素。アカウントの状態表示はここへ差し込む。 */
  action?: ReactNode;
};

/**
 * 全画面共通のヘッダー。ロゴと右上のスロットだけを持ち、
 * 何を出すかは呼び出し側が決める（アカウントの知識はここに置かない）。
 *
 * sticky にしないのは、ボトムナビと違って上部の常時表示が要らず、
 * 本文側に余白計算を持ち込みたくないため。
 */
export function AppHeader({ action }: Props) {
  return (
    <header className="border-b-2 border-faded-gray bg-paper-white">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <Link
          href="/"
          className="min-h-11 items-center text-[19px] leading-[1.4] font-bold text-charcoal flex"
        >
          Poop Battler
        </Link>
        {action}
      </div>
    </header>
  );
}
