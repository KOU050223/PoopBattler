"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";

import {
  Poopm3DModel,
  type Poopm3DAppearance,
  type Poopm3DMotionRequest,
} from "@/features/poopm-3d/components/poopm-3d-model";
import type { Poopm3DBattleMotion } from "@/features/poopm-3d/poopm-3d.motion";

export type Poopm3DStageFighter = {
  appearance: Poopm3DAppearance;
  motion: Poopm3DMotionRequest;
};

export type Poopm3DStageProps = {
  player: Poopm3DStageFighter;
  enemy: Poopm3DStageFighter;
  // バトル倍速。両者の AnimationMixer.timeScale に掛ける。
  speed?: number;
  onMotionFinished?: (side: "player" | "enemy", name: Poopm3DBattleMotion) => void;
};

export function Poopm3DStage({
  player,
  enemy,
  speed = 1,
  onMotionFinished,
}: Poopm3DStageProps) {
  return (
    <Canvas
      // 2D版と近い斜め見下ろし構図。カメラは固定で OrbitControls は付けない。
      camera={{ position: [0.15, 3.0, 7.8], fov: 30 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
      onCreated={({ camera }) => camera.lookAt(0, 0.8, -0.4)}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.85} />
      <directionalLight position={[3, 5, 4]} intensity={1.5} />
      <Suspense fallback={null}>
        {/* 敵 = 奥・小さめ、味方 = 手前・大きめ（2D版の遠近感を踏襲） */}
        <Poopm3DModel
          appearance={enemy.appearance}
          motion={enemy.motion}
          facing="front"
          timeScale={speed}
          position={[0.6, 0, -1.5]}
          scale={0.82}
          onMotionFinished={(name) => onMotionFinished?.("enemy", name)}
        />
        <Poopm3DModel
          appearance={player.appearance}
          motion={player.motion}
          facing="back"
          timeScale={speed}
          position={[-0.55, 0, 0.7]}
          scale={1.05}
          onMotionFinished={(name) => onMotionFinished?.("player", name)}
        />
        <ContactShadows
          position={[0, -0.01, -0.2]}
          opacity={0.32}
          scale={7}
          blur={2.4}
          far={4}
          frames={Infinity}
        />
      </Suspense>
    </Canvas>
  );
}
