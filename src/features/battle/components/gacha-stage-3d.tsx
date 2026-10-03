"use client";

import dynamic from "next/dynamic";

import type { Poopm3DGachaProps } from "@/features/poopm-3d/components/poopm-3d-gacha";

// three を SSR バンドルに入れないよう、ステージ本体はクライアントだけで読み込む。
const Poopm3DGacha = dynamic(
  () =>
    import("@/features/poopm-3d/components/poopm-3d-gacha").then(
      (module) => module.Poopm3DGacha,
    ),
  { ssr: false, loading: () => null },
);

// ガチャ reveal のスポーン位置に Canvas を全面に敷くための DOM ラッパー。
export function GachaStage3D(props: Poopm3DGachaProps) {
  return (
    <div aria-hidden="true" className="absolute inset-0">
      <Poopm3DGacha {...props} />
    </div>
  );
}
