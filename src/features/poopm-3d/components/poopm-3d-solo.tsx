"use client";

import { Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";

import { Poopm3DBlobShadow } from "@/features/poopm-3d/components/poopm-3d-blob-shadow";
import {
  Poopm3DModel,
  type Poopm3DAppearance,
  type Poopm3DMotionRequest,
} from "@/features/poopm-3d/components/poopm-3d-model";
import type { Poopm3DBattleMotion } from "@/features/poopm-3d/poopm-3d.motion";

export type Poopm3DSoloProps = {
  appearance: Poopm3DAppearance;
  motion: Poopm3DMotionRequest;
  onMotionFinished?: (name: Poopm3DBattleMotion) => void;
};

// カメラは固定。正面からの単体表示用に、頭頂 y≈0.63・足裏 y≈-2.25 の
// 全身が枠内に収まる距離を取る（ガチャ・結果カード共用）。
function SoloCamera() {
  const camera = useThree((state) => state.camera);
  useEffect(() => {
    camera.position.set(0, 0.7, 6.6);
    camera.lookAt(0, -0.85, 0);
  }, [camera]);
  return null;
}

// うんちくん1体だけを透明背景で描く小型ステージ。
// ガチャの這い出しや結果カードなど、DOM上の任意の位置に重ねて使う。
export function Poopm3DSolo({
  appearance,
  motion,
  onMotionFinished,
}: Poopm3DSoloProps) {
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
      <SoloCamera />
    </Canvas>
  );
}
