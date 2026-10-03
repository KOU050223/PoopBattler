"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";

import { Poopm3DBlobShadow } from "@/features/poopm-3d/components/poopm-3d-blob-shadow";
import {
  Poopm3DModel,
  type Poopm3DAppearance,
  type Poopm3DMotionRequest,
} from "@/features/poopm-3d/components/poopm-3d-model";
import type { Poopm3DBattleMotion } from "@/features/poopm-3d/poopm-3d.motion";

export type Poopm3DGachaProps = {
  appearance: Poopm3DAppearance;
  reduceMotion?: boolean;
};

// 這い出し（swap_in）→ お祝い（win）→ 待機（idle）の3段。
// once クリップの終了通知で次へ進める。
function nextRevealMotion(name: Poopm3DBattleMotion): Poopm3DBattleMotion | null {
  if (name === "swap_in") return "win";
  if (name === "win") return "idle";
  return null;
}

// カメラは固定。便器を上から見る構図に合わせ、やや俯瞰で胴中央を見る。
// 頭頂 y≈0.63・足裏 y≈-2.25 の全身が枠内に収まる距離を取る。
function GachaCamera() {
  const camera = useThree((state) => state.camera);
  useEffect(() => {
    camera.position.set(0, 0.7, 6.6);
    camera.lookAt(0, -0.85, 0);
  }, [camera]);
  return null;
}

export function Poopm3DGacha({
  appearance,
  reduceMotion = false,
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
    <Canvas
      camera={{ position: [0, 0.7, 6.6], fov: 30 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.75} />
      <hemisphereLight args={["#e8f2ff", "#8a7f76", 0.45]} />
      <directionalLight position={[3, 5, 4]} intensity={1.3} />
      <Suspense fallback={null}>
        <Poopm3DModel
          appearance={appearance}
          motion={motion}
          facing="front"
          position={[0, 0, 0]}
          onMotionFinished={onMotionFinished}
        />
        <Poopm3DBlobShadow x={0} z={0} />
      </Suspense>
      <GachaCamera />
    </Canvas>
  );
}
