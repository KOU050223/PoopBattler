"use client";

import dynamic from "next/dynamic";

import type { Poopm3DAppearance } from "@/features/poopm-3d/components/poopm-3d-model";
import type { Poopm3DBattleMotion } from "@/features/poopm-3d/poopm-3d.motion";

// three を SSR バンドルに入れないよう、ステージ本体はクライアントだけで読み込む。
const Poopm3DSolo = dynamic(
  () =>
    import("@/features/poopm-3d/components/poopm-3d-solo").then(
      (module) => module.Poopm3DSolo,
    ),
  { ssr: false, loading: () => null },
);

export type PoopmFigure3DProps = {
  appearance: Poopm3DAppearance;
  motion?: Poopm3DBattleMotion;
  label?: string;
  className?: string;
};

// 2D PoopmFigure の3D版ドロップイン。カード内の1体表示など
// モーション連鎖を持たない用途向け。
export function PoopmFigure3D({
  appearance,
  motion = "idle",
  label = "うんちくん",
  className,
}: PoopmFigure3DProps) {
  return (
    <div
      role="img"
      aria-label={label}
      className={["relative", className].filter(Boolean).join(" ")}
    >
      <div aria-hidden="true" className="absolute inset-0">
        <Poopm3DSolo appearance={appearance} motion={{ name: motion, nonce: 0 }} />
      </div>
    </div>
  );
}
