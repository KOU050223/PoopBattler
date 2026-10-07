import { useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber/native";

import { STAGE_GROUND_Y } from "../poopm-3d.camera";
import type { Poopm3DBattleMotion } from "../poopm-3d.motion";
import { Poopm3DBlobShadow } from "./poopm-3d-blob-shadow";
import { Poopm3DModel, type Poopm3DAppearance, type Poopm3DMotionRequest } from "./poopm-3d-model";

export type Poopm3DSoloProps = {
  appearance: Poopm3DAppearance;
  motion: Poopm3DMotionRequest;
  onMotionFinished?: (name: Poopm3DBattleMotion) => void;
};

const BASE_FOV_DEG = 30;

// カメラは固定。正面からの単体表示用に、頭頂 y≈0.63・足裏 y≈-2.25 の
// 全身が枠内に収まる距離を取る。
function SoloCamera() {
  const camera = useThree((state) => state.camera);
  useEffect(() => {
    camera.position.set(0, 0.7, 6.6);
    camera.lookAt(0, -0.85, 0);
  }, [camera]);
  return null;
}

// うんちくん1体だけを透明背景で描く小型ステージ。親の箱いっぱいに広がる。
// ガチャAR用の gravityUp / overscan は T-009 で必要になったとき移植する。
export function Poopm3DSolo({ appearance, motion, onMotionFinished }: Poopm3DSoloProps) {
  return (
    <Canvas camera={{ position: [0, 0.7, 6.6], fov: BASE_FOV_DEG }} gl={{ antialias: true, alpha: true }} style={{ flex: 1 }}>
      <ambientLight intensity={0.75} />
      <hemisphereLight args={["#e8f2ff", "#8a7f76", 0.45]} />
      <directionalLight position={[3, 5, 4]} intensity={1.3} />
      {/* モデル原点は足裏より上（足 y≈-2.25）にあるため、足裏が y=0 になるよう持ち上げて置く。 */}
      <group position={[0, STAGE_GROUND_Y, 0]}>
        <Poopm3DModel
          appearance={appearance}
          motion={motion}
          facing="front"
          position={[0, -STAGE_GROUND_Y, 0]}
          onMotionFinished={onMotionFinished}
        />
        <Poopm3DBlobShadow x={0} z={0} y={0} />
      </group>
      <SoloCamera />
    </Canvas>
  );
}
