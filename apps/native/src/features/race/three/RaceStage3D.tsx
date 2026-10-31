import { Canvas } from "@react-three/fiber/native";
import type { ReactNode, RefObject } from "react";

import type { CameraOutput } from "../camera";
import type { Race } from "../types";
import { CameraRig } from "./CameraRig";
import { Course3D } from "./Course3D";
import { Runners3D } from "./Runners3D";

const SKY_COLOR = "#bfe4fa";
const FOG_NEAR = 50;
const FOG_FAR = 190;
const INITIAL_CAMERA_POSITION: [number, number, number] = [0, 8, -16];
const INITIAL_FOV = 48;
/** 地面が遠くまで続くので、fog の外まで描かせないよう far は fog の終わりより少し先に置く */
const CAMERA_FAR = 220;

export interface RaceStage3DProps {
  /** レースの状態。毎フレーム読むだけで、進めない。コースはマウント時の1回だけ読むので、レースごとに key を変えて作り直す */
  raceRef: RefObject<Race>;
  /** camera.ts の director の出力。null の間はカメラを動かさない */
  cameraRef: RefObject<CameraOutput | null>;
  /** OS の「視差効果を減らす」。観客の跳ね・走る揺れを止める */
  isReducedMotion?: boolean;
  /** Canvas 内に描く。粒子などの差し込み口 */
  children?: ReactNode;
}

/** レースの 3D ステージ。状態はすべて ref で受け、React の state は毎フレーム更新しない */
export function RaceStage3D({ raceRef, cameraRef, isReducedMotion = false, children }: RaceStage3DProps) {
  return (
    <Canvas camera={{ position: INITIAL_CAMERA_POSITION, fov: INITIAL_FOV, near: 0.3, far: CAMERA_FAR }} gl={{ antialias: true }} style={{ flex: 1 }}>
      <color attach="background" args={[SKY_COLOR]} />
      <fog attach="fog" args={[SKY_COLOR, FOG_NEAR, FOG_FAR]} />
      <hemisphereLight args={["#ffffff", "#9fcf8a", 0.95]} />
      <directionalLight position={[30, 60, 20]} intensity={0.55} />
      <Course3D raceRef={raceRef} isReducedMotion={isReducedMotion} />
      <Runners3D raceRef={raceRef} isReducedMotion={isReducedMotion} />
      <CameraRig cameraRef={cameraRef} />
      {children}
    </Canvas>
  );
}
