"use client";

import { Suspense, useEffect, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { Poopm3DBlobShadow } from "@/features/poopm-3d/components/poopm-3d-blob-shadow";
import {
  Poopm3DModel,
  type Poopm3DAppearance,
  type Poopm3DMotionRequest,
} from "@/features/poopm-3d/components/poopm-3d-model";
import { STAGE_GROUND_Y } from "@/features/poopm-3d/poopm-3d.camera";
import type { Poopm3DBattleMotion } from "@/features/poopm-3d/poopm-3d.motion";
import type { GravityVec3 } from "@/features/battle/companionship-gravity";

export type Poopm3DSoloProps = {
  appearance: Poopm3DAppearance;
  motion: Poopm3DMotionRequest;
  onMotionFinished?: (name: Poopm3DBattleMotion) => void;
  /**
   * カメラ空間での世界の上向き（床法線）。渡すとモデルと床影が
   * 実際の床に立つ向きへ傾く。null/省略は恒等姿勢（直立）。
   */
  gravityUp?: GravityVec3 | null;
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

const LOCAL_UP = new THREE.Vector3(0, 1, 0);

// モデル+床影を足裏接地点まわりで「世界の上向き」へ傾ける。
// up=null のときは恒等姿勢へ戻す。slerp でセンサーの段差を吸収する。
function GravityAligned({ up, children }: { up: GravityVec3 | null | undefined; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const target = useRef(new THREE.Quaternion());
  const dir = useRef(new THREE.Vector3());

  useFrame(() => {
    const group = ref.current;
    if (!group) return;
    if (up) {
      dir.current.set(up.x, up.y, up.z).normalize();
      target.current.setFromUnitVectors(LOCAL_UP, dir.current);
    } else {
      target.current.identity();
    }
    group.quaternion.slerp(target.current, 0.25);
  });

  return (
    <group ref={ref} position={[0, STAGE_GROUND_Y, 0]}>
      {children}
    </group>
  );
}

// うんちくん1体だけを透明背景で描く小型ステージ。
// ガチャの這い出しや結果カードなど、DOM上の任意の位置に重ねて使う。
export function Poopm3DSolo({
  appearance,
  motion,
  onMotionFinished,
  gravityUp = null,
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
        <GravityAligned up={gravityUp}>
          {/* モデル原点は足裏より上（足 y≈-2.25）にあるため、group 原点=足裏に
              なるよう +STAGE_GROUND_Y 分持ち上げて置く。 */}
          <Poopm3DModel
            appearance={appearance}
            motion={motion}
            facing="front"
            position={[0, -STAGE_GROUND_Y, 0]}
            onMotionFinished={onMotionFinished}
          />
          <Poopm3DBlobShadow x={0} z={0} y={0} />
        </GravityAligned>
      </Suspense>
      <SoloCamera />
    </Canvas>
  );
}
