import { FOV_LANDSCAPE, FOV_PORTRAIT, PORTRAIT_ASPECT, TOP, TOILET_X, YAW_LIMIT } from "./constants";
import type { Side } from "../types";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface CameraRig {
  position: Vec3;
  lookAt: Vec3;
}

const lerp = (from: number, to: number, ratio: number): number => from + (to - from) * ratio;
const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const lerpVec = (from: Vec3, to: Vec3, ratio: number): Vec3 => ({
  x: lerp(from.x, to.x, ratio),
  y: lerp(from.y, to.y, ratio),
  z: lerp(from.z, to.z, ratio),
});

/** 1フレーム(60fps)あたりの追従率を、フレーム間隔に依存しない形へ直す */
const FRAME_MS = 1000 / 60;
const perFrameRate = (ratioPerFrame: number, dtMs: number): number => 1 - Math.pow(1 - ratioPerFrame, dtMs / FRAME_MS);

export const isPortrait = (aspect: number): boolean => aspect < PORTRAIT_ASPECT;
export const baseFov = (aspect: number): number => (isPortrait(aspect) ? FOV_PORTRAIT : FOV_LANDSCAPE);

/** yawTarget へ加算して ±YAW_LIMIT に収める */
export function addYaw(yawTarget: number, delta: number): number {
  return Math.max(-YAW_LIMIT, Math.min(YAW_LIMIT, yawTarget + delta));
}

/** 軸の回り込み。rawDtMs はスローモーを掛ける前の実時間 */
export function stepYaw(yaw: number, yawTarget: number, rawDtMs: number): number {
  return lerp(yaw, yawTarget, clamp01(rawDtMs * 0.006));
}

/** カメラは軸より遅れて回り込む */
export function stepCamYaw(camYaw: number, yaw: number, rawDtMs: number): number {
  return lerp(camYaw, yaw, clamp01(rawDtMs * 0.0018));
}

export interface CameraTargetInput {
  aspect: number;
  camYaw: number;
  eastPosition: Vec3;
  westPosition: Vec3;
  /** null なら取組中 */
  winner: Side | null;
}

/** 決着カメラの俯角。真下(90°)は lookAt の上方向が定まらないので避ける */
const END_CAM_ELEVATION_RAD = (70 * Math.PI) / 180;
/** 勝者側(落下開始位置の手前)と便器の外側まで、フレームに入れたい x の余白 */
const END_CAM_NEAR_MARGIN = 2.5;
const END_CAM_TOILET_MARGIN = 1.4;
/** 画角ぎりぎりで見切れないための余裕 */
const END_CAM_FIT_SLACK = 1.15;

/**
 * 敗者の側(s=±1)へ寄せた上空のカメラ。画角から距離を逆算するので、縦持ちでも
 * 「勝者側〜便器」の横幅が必ず収まる
 */
function endCameraRig(aspect: number, winner: Side): CameraRig {
  const loserDirection = winner === 0 ? 1 : -1;
  const nearX = -END_CAM_NEAR_MARGIN;
  const farX = TOILET_X + END_CAM_TOILET_MARGIN;
  const centerX = loserDirection * ((nearX + farX) / 2);
  const halfWidth = (farX - nearX) / 2;
  const halfFovTan = Math.tan((baseFov(aspect) * Math.PI) / 360);
  const distance = (halfWidth / (halfFovTan * aspect)) * END_CAM_FIT_SLACK;
  return {
    position: {
      x: centerX,
      y: TOP + distance * Math.sin(END_CAM_ELEVATION_RAD),
      z: distance * Math.cos(END_CAM_ELEVATION_RAD),
    },
    lookAt: { x: centerX, y: TOP, z: 0 },
  };
}

/** 取組中は東の背後から土俵を見渡す。決着後は敗者の落下と便器を上から見下ろす */
export function cameraTarget(input: CameraTargetInput): CameraRig {
  const { aspect, camYaw, eastPosition, westPosition, winner } = input;
  const cos = Math.cos(camYaw);
  const sin = Math.sin(camYaw);

  if (winner !== null) return endCameraRig(aspect, winner);

  const portrait = isPortrait(aspect);
  const back = portrait ? 5.2 : 4.4;
  const side = portrait ? 3.6 : 3.4;
  const midX = (eastPosition.x + westPosition.x) / 2;
  const midZ = (eastPosition.z + westPosition.z) / 2;
  return {
    position: { x: eastPosition.x - cos * back + sin * side, y: portrait ? 5.0 : 3.8, z: eastPosition.z + sin * back + cos * side },
    lookAt: { x: midX + cos * 0.6, y: 1.15, z: midZ - sin * 0.6 },
  };
}

const POSITION_FOLLOW_PER_MS = 0.005;
const LOOK_AT_FOLLOW_PER_FRAME = 0.08;

/**
 * 位置は遅れて追い、注視点は少し速く追う。
 * isSnap は取組の開始直後など、補間せずに合わせたいとき
 */
export function stepCamera(current: CameraRig, target: CameraRig, dtMs: number, isSnap = false): CameraRig {
  if (isSnap) return { position: target.position, lookAt: target.lookAt };
  return {
    position: lerpVec(current.position, target.position, clamp01(dtMs * POSITION_FOLLOW_PER_MS)),
    lookAt: lerpVec(current.lookAt, target.lookAt, perFrameRate(LOOK_AT_FOLLOW_PER_FRAME, dtMs)),
  };
}

/** FOVキックは実時間で戻す */
export const decayFovKick = (fovKick: number, rawDtMs: number): number => Math.max(0, fovKick - rawDtMs * 0.02);
export const decayShake = (shake: number, dtMs: number): number => Math.max(0, shake - dtMs * 0.0012);
