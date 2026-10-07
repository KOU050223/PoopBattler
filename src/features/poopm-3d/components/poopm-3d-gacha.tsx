"use client";

import { useCallback, useState } from "react";

import type {
  Poopm3DAppearance,
  Poopm3DMotionRequest,
} from "@/features/poopm-3d/components/poopm-3d-model";
import { Poopm3DSolo } from "@/features/poopm-3d/components/poopm-3d-solo";
import type { Poopm3DBattleMotion } from "@/features/poopm-3d/poopm-3d.motion";
import type { GravityVec3 } from "@/features/battle/companionship-gravity";

export type Poopm3DGachaProps = {
  appearance: Poopm3DAppearance;
  reduceMotion?: boolean;
  /** 床法線（カメラ空間の世界の上向き）。null/省略は直立。 */
  gravityUp?: GravityVec3 | null;
  /** 描画領域を親の箱より広げる倍率。傾いたモデルがキャンバス端で切れるのを防ぐ。 */
  overscan?: number;
};

// 這い出し（swap_in）→ お祝い（win）→ 待機（idle）の3段。
// once クリップの終了通知で次へ進める。
function nextRevealMotion(name: Poopm3DBattleMotion): Poopm3DBattleMotion | null {
  if (name === "swap_in") return "win";
  if (name === "win") return "idle";
  return null;
}

export function Poopm3DGacha({
  appearance,
  reduceMotion = false,
  gravityUp = null,
  overscan,
}: Poopm3DGachaProps) {
  const [motion, setMotion] = useState<Poopm3DMotionRequest>({
    name: reduceMotion ? "idle" : "swap_in",
    nonce: 0,
  });

  const onMotionFinished = useCallback((name: Poopm3DBattleMotion) => {
    setMotion((prev) => {
      const next = prev.name === name ? nextRevealMotion(name) : null;
      return next ? { name: next, nonce: prev.nonce + 1 } : prev;
    });
  }, []);

  return (
    <Poopm3DSolo
      appearance={appearance}
      motion={motion}
      onMotionFinished={onMotionFinished}
      gravityUp={gravityUp}
      overscan={overscan}
    />
  );
}
