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
  /**
   * 描画領域を親の箱より何倍広く取るか（中心固定）。画角も同率で広げるので
   * 箱の中のモデルの見かけは変わらず、周囲に余白だけが増える。
   * 傾けた姿勢（頭がカメラ側へ倒れる等）がキャンバス端で切れるのを防ぐ。
   */
  overscan?: number;
};

const BASE_FOV_DEG = 30;

function overscanFovDeg(overscan: number) {
  const half = (BASE_FOV_DEG * Math.PI) / 360;
  return (2 * Math.atan(overscan * Math.tan(half)) * 180) / Math.PI;
}

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

// 全身の中心（SoloCamera の注視点と同じ高さ）。傾きの回転軸をここに置く。
const BODY_CENTER_Y = -0.85;

// モデル+床影を「世界の上向き」へ傾ける。回転軸は足裏ではなく胴中央:
// 足裏軸だと傾けた分だけ体の中心が画面中心（=検出枠の中心）からずれるため。
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
    <group ref={ref} position={[0, BODY_CENTER_Y, 0]}>
      <group position={[0, STAGE_GROUND_Y - BODY_CENTER_Y, 0]}>{children}</group>
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
  overscan = 1,
}: Poopm3DSoloProps) {
  const canvas = (
    <Canvas
      camera={{ position: [0, 0.7, 6.6], fov: overscanFovDeg(overscan) }}
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

  if (overscan <= 1) return canvas;
  // 親の箱の中心を保ったまま四方へ広げる。親は relative/サイズ指定済みの前提。
  const inset = `${((1 - overscan) / 2) * 100}%`;
  return (
    <div className="pointer-events-none absolute" style={{ inset }}>
      {canvas}
    </div>
  );
}
