"use client";

import { useEffect, useRef } from "react";
import { useInView } from "framer-motion";

import type { Poopm3DAppearance } from "@/features/poopm-3d/components/poopm-3d-model";
import type { Poopm3DBattleMotion } from "@/features/poopm-3d/poopm-3d.motion";

export type PoopmFigure3DProps = {
  appearance: Poopm3DAppearance;
  motion?: Poopm3DBattleMotion;
  label?: string;
  className?: string;
};

// 2D PoopmFigure の3D版ドロップイン。カード内の1体表示など
// モーション連鎖を持たない用途向け。
// WebGLコンテキストは貴重なので（上限〜16個）、1枠=1Canvasの常駐化はしない。
// 画面周辺の枠だけがプールのcanvasを借りる（viewport ±500px）。
// プールのcanvasは枠間を移動して使い回すため、スクロールでコンテキストを
// 作り捨てない — WebKit は loseContext してもコンテキストを解放しない
// （#218305）ので、使い回しがないと表示中のCanvasが強制ロストで白抜きになる。
export function PoopmFigure3D({
  appearance,
  motion = "idle",
  label = "うんちくん",
  className,
}: PoopmFigure3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const inView = useInView(hostRef, { margin: "500px" });

  useEffect(() => {
    const host = hostRef.current;
    if (!inView || !host) return;

    // three を SSR バンドル・初期バンドルに入れないよう遅延ロードする。
    let release: (() => void) | undefined;
    let alive = true;
    void import("@/features/poopm-3d/components/poopm-figure-pool").then(
      (pool) => {
        if (!alive || !hostRef.current) return;
        release = pool.claimFigureCanvas(hostRef.current, {
          appearance,
          motion: { name: motion, nonce: 0 },
        });
      },
    );
    return () => {
      alive = false;
      release?.();
    };
  }, [inView, appearance, motion]);

  return (
    <div
      ref={hostRef}
      role="img"
      aria-label={label}
      className={["relative", className].filter(Boolean).join(" ")}
    />
  );
}
