"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";

import { Poopm3DCameraRig } from "@/features/poopm-3d/components/poopm-3d-camera-rig";
import { Poopm3DField } from "@/features/poopm-3d/components/poopm-3d-field";
import {
  Poopm3DModel,
  type Poopm3DAppearance,
  type Poopm3DMotionRequest,
} from "@/features/poopm-3d/components/poopm-3d-model";
import {
  ENEMY_SCALE,
  PLAYER_SCALE,
  STAGE_ANCHOR,
  STAGE_CAMERA_WIDE,
  STAGE_GROUND_Y,
} from "@/features/poopm-3d/poopm-3d.camera";
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
  const reduceMotion = useReducedMotion() ?? false;
  return (
    <Canvas
      // 初期値はワイドショット。以降のカメラ制御は CameraRig が持つ。
      camera={{ position: [...STAGE_CAMERA_WIDE.position], fov: STAGE_CAMERA_WIDE.fov }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.7} />
      <hemisphereLight args={["#cfeaff", "#79b968", 0.5]} />
      <directionalLight position={[3, 5, 4]} intensity={1.4} />
      <Suspense fallback={null}>
        <Poopm3DField />
        {/* 敵 = 奥・小さめ、味方 = 手前・大きめ（2D版の遠近感を踏襲） */}
        <Poopm3DModel
          appearance={enemy.appearance}
          motion={enemy.motion}
          facing="front"
          timeScale={speed}
          position={STAGE_ANCHOR.enemy.position}
          scale={ENEMY_SCALE}
          onMotionFinished={(name) => onMotionFinished?.("enemy", name)}
        />
        <Poopm3DModel
          appearance={player.appearance}
          motion={player.motion}
          facing="back"
          timeScale={speed}
          position={STAGE_ANCHOR.player.position}
          scale={PLAYER_SCALE}
          onMotionFinished={(name) => onMotionFinished?.("player", name)}
        />
        {/* 両者の中間あたりをカバー。間合いを広げても足元に影が残る範囲にする */}
        <ContactShadows
          position={[0.15, STAGE_GROUND_Y + 0.012, -1.5]}
          opacity={0.32}
          scale={11}
          blur={2.4}
          far={4}
          frames={Infinity}
        />
      </Suspense>
      <Poopm3DCameraRig
        player={player.motion}
        enemy={enemy.motion}
        reduceMotion={reduceMotion}
      />
    </Canvas>
  );
}
