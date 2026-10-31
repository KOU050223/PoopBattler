import { Canvas, useFrame, useThree } from "@react-three/fiber/native";
import { useRef } from "react";
import { View } from "react-native";
import type { Group, PerspectiveCamera } from "three";

import { Poopm3DModel, type Poopm3DMotionRequest } from "../../poopm-3d/components/poopm-3d-model";
import { runnerAppearance } from "./runner-appearance";

/** 表彰台の1段の幅。RN 側の名前の列も同じ 3 等分で並べるので、幅の合計 = 画面の横幅になる */
const SLOT_WIDTH = 2.2;
const BOX_WIDTH = 2;
const BOX_DEPTH = 1.6;
const SLOT_COUNT = 3;
const VISIBLE_WIDTH = SLOT_WIDTH * SLOT_COUNT;
const BOX_HEIGHT_BY_PLACE: Record<number, number> = { 1: 2.4, 2: 1.8, 3: 1.4 };
/** 表彰台は 2位・1位・3位 の並び（左から） */
export const PODIUM_PLACES_LEFT_TO_RIGHT = [2, 1, 3] as const;

const MODEL_SCALE = 0.6;
/** モデル空間で足先は原点より 2.25 下（Runners3D の MODEL_FEET_DROP と同じ） */
const MODEL_FEET_DROP = 2.25;
const CAMERA_FOV = 40;
/** 画面の縦に収めたい高さ。箱の上に走者が立った全体が入る */
const VISIBLE_HEIGHT = 5.6;

export interface PodiumStageEntry {
  place: number;
  runnerIndex: number;
  /** 立ち上がりを始めるまでの秒数 */
  delaySec: number;
}

export interface PodiumStage3DProps {
  entries: readonly PodiumStageEntry[];
  riseSec: number;
  isReducedMotion: boolean;
  height: number;
}

const WIN_MOTION: Poopm3DMotionRequest = { name: "win", nonce: 1 };
const IDLE_MOTION: Poopm3DMotionRequest = { name: "idle", nonce: 1 };

/** 表彰台の 3D。カメラは水平に正面を向け、箱の位置が RN 側の 3 列とずれないようにする */
export function PodiumStage3D({ entries, riseSec, isReducedMotion, height }: PodiumStage3DProps) {
  return (
    // Canvas は親の大きさに従う（RaceStage3D と同じ）。高さは外側の View で決める
    <View style={{ height }}>
    <Canvas camera={{ fov: CAMERA_FOV, near: 0.1, far: 60 }} gl={{ antialias: true }} style={{ flex: 1 }}>
      <FrontCamera />
      <hemisphereLight args={["#ffffff", "#f3b8cf", 1.2]} />
      {/* 台の正面（カメラ側）にも光を当てる。上からだけだと正面が暗くくすむ */}
      <directionalLight position={[0, 3, 10]} intensity={1.4} />
      <directionalLight position={[4, 8, 4]} intensity={0.5} />
      {entries.map((entry) => (
        <PodiumStep key={entry.place} entry={entry} riseSec={riseSec} isReducedMotion={isReducedMotion} />
      ))}
    </Canvas>
    </View>
  );
}

/** 横幅がちょうど表彰台 3 段に収まる距離へ、縦は VISIBLE_HEIGHT の中心へ向ける */
function FrontCamera() {
  const size = useThree((state) => state.size);
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  useFrame(() => {
    const aspect = size.width / size.height;
    const distance = VISIBLE_WIDTH / (2 * Math.tan((CAMERA_FOV * Math.PI) / 360) * aspect);
    camera.position.set(0, VISIBLE_HEIGHT / 2, distance);
    camera.lookAt(0, VISIBLE_HEIGHT / 2, 0);
  });
  return null;
}

function PodiumStep({ entry, riseSec, isReducedMotion }: { entry: PodiumStageEntry; riseSec: number; isReducedMotion: boolean }) {
  const stepRef = useRef<Group>(null);
  const runnerRef = useRef<Group>(null);
  const boxHeight = BOX_HEIGHT_BY_PLACE[entry.place] ?? BOX_HEIGHT_BY_PLACE[3];
  const x = (PODIUM_PLACES_LEFT_TO_RIGHT.indexOf(entry.place as 1 | 2 | 3) - 1) * SLOT_WIDTH;

  useFrame((state) => {
    const step = stepRef.current;
    const runner = runnerRef.current;
    if (!step || !runner) return;
    const progress = isReducedMotion ? 1 : Math.min(1, Math.max(0, (state.clock.elapsedTime - entry.delaySec) / riseSec));
    // 立ち上がりは減速（easeOutCubic）。足元の箱と上の走者を同じ進み方で動かす
    const eased = 1 - (1 - progress) ** 3;
    step.visible = progress > 0;
    step.scale.y = Math.max(eased, 0.001);
    runner.position.y = boxHeight * eased;
  });

  return (
    <group position={[x, 0, 0]}>
      <group ref={stepRef} visible={false}>
        <mesh position={[0, boxHeight / 2, 0]}>
          <boxGeometry args={[BOX_WIDTH, boxHeight, BOX_DEPTH]} />
          <meshStandardMaterial color={entry.place === 1 ? "#ff7aac" : "#ffffff"} />
        </mesh>
      </group>
      <group ref={runnerRef}>
        <Poopm3DModel
          appearance={runnerAppearance(entry.runnerIndex)}
          motion={entry.place === 1 ? WIN_MOTION : IDLE_MOTION}
          position={[0, MODEL_FEET_DROP * MODEL_SCALE, 0]}
          scale={MODEL_SCALE}
        />
      </group>
    </group>
  );
}
