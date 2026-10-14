"use client";

import dynamic from "next/dynamic";

import type { Poopm3DStageProps } from "@/features/poopm-3d/components/poopm-3d-stage";

// three を SSR バンドルに入れないよう、ステージ本体はクライアントだけで読み込む。
const Poopm3DStage = dynamic(
  () =>
    import("@/features/poopm-3d/components/poopm-3d-stage").then(
      (module) => module.Poopm3DStage,
    ),
  { ssr: false, loading: () => null },
);

// バトル画面のパネル内で Canvas を全面に敷くための DOM ラッパー。
export function BattleStage3D(props: Poopm3DStageProps) {
  return (
    <div aria-hidden="true" className="absolute inset-0">
      <Poopm3DStage {...props} />
    </div>
  );
}
