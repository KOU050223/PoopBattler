import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber/native";
import type { Group } from "three";

import type { BodyColorId, EyeId, MouthId } from "../../battle/poopm-appearance";
import { Poopm3DModel, type Poopm3DAppearance, type Poopm3DMotionRequest } from "../../poopm-3d/components/poopm-3d-model";
import { RUNNER_COUNT } from "../config";
import type { Race } from "../types";
import { createRunnerPose, poseRunner } from "./runner-pose";

/** モデル空間で足先は原点より 2.25 下（poopm-3d-camera.ts の MODEL_FEET_Y） */
const MODEL_FEET_DROP = 2.25;
/** 当たり判定の直径（RUNNER_RADIUS 0.75 の 2 倍）。見た目の横幅はこれに収める */
const RUNNER_BODY_WIDTH = 1.5;
/** poopm_base.glb を idle で再生して測った横幅（腕込み、モデル空間で 3.07。体のトーラスだけだと 2.02） */
const MODEL_WIDTH = 3.07;
export const RUNNER_MODEL_SCALE = Math.round((RUNNER_BODY_WIDTH / MODEL_WIDTH) * 100) / 100;

const SHADOW_RADIUS = 0.8;
const SHADOW_OPACITY = 0.16;
const SHADOW_MIN_SCALE = 0.55;
const SHADOW_LIFT = 0.03;
const MARKER = { inner: 0.95, outer: 1.2, color: "#ff7aac" };

/** プレイヤー（0 番）だけ他と見分けがつく色。残りは互いに離れた色を順に当てる */
const BODY_COLORS: readonly BodyColorId[] = ["red", "blue", "green", "orange", "purple", "cyan", "gold", "mint"];
const EYES: readonly EyeId[] = ["eye-a", "eye-b", "eye-c", "eye-d", "eye-e", "eye-f", "eye-g", "eye-h"];
const MOUTHS: readonly MouthId[] = ["mouth-a", "mouth-b", "mouth-c", "mouth-d", "mouth-e", "mouth-f", "mouth-g", "mouth-h"];
const IDLE_MOTION: Poopm3DMotionRequest = { name: "idle", nonce: 0 };

function appearanceOf(index: number): Poopm3DAppearance {
  return { color: BODY_COLORS[index % BODY_COLORS.length], eyes: EYES[index % EYES.length], mouth: MOUTHS[index % MOUTHS.length], head: "none" };
}

interface RunnerRefs {
  root: Group | null;
  tilt: Group | null;
  shadow: Group | null;
}

export interface Runners3DProps {
  raceRef: RefObject<Race>;
  isReducedMotion: boolean;
}

/** 走者 RUNNER_COUNT 体。位置・向き・傾きは useFrame で three のオブジェクトへ直接書く（React は再描画しない） */
export function Runners3D({ raceRef, isReducedMotion }: Runners3DProps) {
  const refs = useRef<RunnerRefs[]>(Array.from({ length: RUNNER_COUNT }, () => ({ root: null, tilt: null, shadow: null })));
  const pose = useMemo(createRunnerPose, []);

  useFrame(() => {
    const race = raceRef.current;
    race.runners.forEach((runner, index) => {
      const { root, tilt, shadow } = refs.current[index];
      if (!root || !tilt || !shadow) return;
      poseRunner(runner, race.time, isReducedMotion, pose);
      root.position.set(pose.x, pose.y, pose.z);
      root.rotation.y = pose.rotationY;
      tilt.rotation.x = pose.pitch;
      tilt.rotation.z = pose.roll;
      // 影は地面に残し、跳んだ分だけ小さくする
      shadow.position.set(runner.x, runner.y + SHADOW_LIFT, runner.z);
      shadow.scale.setScalar(Math.max(SHADOW_MIN_SCALE, 1 - pose.lift * 0.3));
    });
  });

  return (
    <>
      {Array.from({ length: RUNNER_COUNT }, (_, index) => (
        <group key={index}>
          <group
            ref={(group) => {
              refs.current[index].root = group;
            }}
          >
            {/* 転倒と傾きは足元を軸にする（モデルの原点は頭側なので、足元まで下げた位置を軸にする） */}
            <group
              ref={(group) => {
                refs.current[index].tilt = group;
              }}
            >
              <Poopm3DModel appearance={appearanceOf(index)} motion={IDLE_MOTION} position={[0, MODEL_FEET_DROP * RUNNER_MODEL_SCALE, 0]} scale={RUNNER_MODEL_SCALE} />
            </group>
          </group>
          <group
            ref={(group) => {
              refs.current[index].shadow = group;
            }}
          >
            <mesh rotation-x={-Math.PI / 2}>
              <circleGeometry args={[SHADOW_RADIUS, 20]} />
              <meshBasicMaterial color="#000000" transparent opacity={SHADOW_OPACITY} />
            </mesh>
            {index === 0 && (
              <mesh rotation-x={-Math.PI / 2} position-y={0.01}>
                <ringGeometry args={[MARKER.inner, MARKER.outer, 32]} />
                <meshBasicMaterial color={MARKER.color} />
              </mesh>
            )}
          </group>
        </group>
      ))}
    </>
  );
}
