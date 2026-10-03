"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
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

// 接地影。drei の ContactShadows は奥行きのある位置で深度パスが空に
// なる事象があったため、放射グラデの簡易ブロブで置く。フラットな絵柄に
// も合い、配置の決定論が利く。
function BlobShadow({ x, z }: { x: number; z: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const gradient = ctx.createRadialGradient(64, 64, 10, 64, 64, 62);
    gradient.addColorStop(0, "rgba(45, 70, 40, 0.42)");
    gradient.addColorStop(0.55, "rgba(45, 70, 40, 0.2)");
    gradient.addColorStop(1, "rgba(45, 70, 40, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
  }, []);
  if (!texture) return null;
  return (
    <mesh
      rotation-x={-Math.PI / 2}
      position={[x, STAGE_GROUND_Y + 0.012, z]}
      renderOrder={1}
    >
      <planeGeometry args={[2.8, 2.8]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}

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
        {/* 接地影は各キャラの直下に1枚ずつ */}
        {(["player", "enemy"] as const).map((side) => (
          <BlobShadow
            key={side}
            x={STAGE_ANCHOR[side].position[0]}
            z={STAGE_ANCHOR[side].position[2]}
          />
        ))}
      </Suspense>
      <Poopm3DCameraRig
        player={player.motion}
        enemy={enemy.motion}
        reduceMotion={reduceMotion}
      />
    </Canvas>
  );
}
