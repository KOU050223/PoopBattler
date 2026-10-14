import { Canvas } from "@react-three/fiber/native";

import { ENEMY_SCALE, PLAYER_SCALE, STAGE_ANCHOR, STAGE_CAMERA_WIDE } from "../poopm-3d.camera";
import type { Poopm3DBattleMotion } from "../poopm-3d.motion";
import { useReduceMotion } from "../use-reduce-motion";
import { Poopm3DBlobShadow } from "./poopm-3d-blob-shadow";
import { Poopm3DCameraRig } from "./poopm-3d-camera-rig";
import { Poopm3DField } from "./poopm-3d-field";
import { Poopm3DModel, type Poopm3DAppearance, type Poopm3DMotionRequest } from "./poopm-3d-model";

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

export function Poopm3DStage({ player, enemy, speed = 1, onMotionFinished }: Poopm3DStageProps) {
  const reduceMotion = useReduceMotion();
  return (
    <Canvas
      // 初期値はワイドショット。以降のカメラ制御は CameraRig が持つ。
      // near/far は R3F 既定の 0.1/1000 だと深度精度が足りず、地面と同一平面の円（+0.004）が
      // z-fighting する。カメラは被写体から 3 以上離れ、空ドームは最遠でも約 50 なので、この範囲で足りる。
      camera={{ position: [...STAGE_CAMERA_WIDE.position], fov: STAGE_CAMERA_WIDE.fov, near: 1, far: 80 }}
      gl={{ antialias: true, alpha: true }}
      style={{ flex: 1 }}
    >
      <ambientLight intensity={0.7} />
      <hemisphereLight args={["#cfeaff", "#79b968", 0.5]} />
      <directionalLight position={[3, 5, 4]} intensity={1.4} />
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
      {(["player", "enemy"] as const).map((side) => (
        <Poopm3DBlobShadow key={side} x={STAGE_ANCHOR[side].position[0]} z={STAGE_ANCHOR[side].position[2]} />
      ))}
      <Poopm3DCameraRig player={player.motion} enemy={enemy.motion} reduceMotion={reduceMotion} />
    </Canvas>
  );
}
