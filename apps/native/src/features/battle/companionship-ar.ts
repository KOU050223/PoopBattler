// companionship-ar-stage.tsx から切り出した純ロジック。
// 判定自体は domain（companionship-ar / toilet-detection）にある。ここは
// RN のイベント座標・カメラ状態を domain の型へ橋渡しするだけに留める。
import type { GravityAxis } from "@poopbattler/domain/battle/companionship-gravity";
import {
  GACHA_SWIPE_MIN_DISTANCE_PX,
  clientPointFromPercent,
  isThrowSwipe,
  type CompanionshipArPhase,
  type PixelPoint,
} from "@poopbattler/domain/battle/companionship-ar";
import {
  percentPointFromClient,
  type PercentPoint,
} from "@poopbattler/domain/battle/toilet-detection";
import type { UserMediaCameraStatus } from "@poopbattler/domain/ports";

import type { ToiletCameraPermission } from "./toilet-detection/use-toilet-detection";

export type StageRect = { left: number; top: number; width: number; height: number };

/**
 * vision-camera の状態を domain の UserMediaCameraStatus へ写す。
 * undetermined は要求ダイアログ表示中として "starting" に寄せる
 * （権限を自動要求するので、ユーザが見る待ち状態はこれ）。
 */
export function gachaCameraStatus(input: {
  permission: ToiletCameraPermission;
  hasDevice: boolean;
  cameraFailed: boolean;
}): UserMediaCameraStatus {
  if (input.cameraFailed) return "error";
  if (input.permission === "denied") return "denied";
  if (input.permission === "granted" && !input.hasDevice) return "unavailable";
  if (input.permission === "undetermined") return "starting";
  return "ready";
}

export type StageTouchDecision =
  | { type: "ignore" }
  // reveal のタップ = 結果画面へ進む操作。スワイプ相当の移動は誤操作として無視。
  | { type: "confirm" }
  // staging のタップ = 便器が見つからないときの投げ入れ先指定。
  | { type: "aim"; point: PercentPoint }
  // staging のスワイプ = 投げ入れ開始。
  | { type: "throw" };

/**
 * タッチ終了（responder release）の判定。web の handlePointerUp と同じ分岐:
 * staging では短いタップ→狙い指定 / 便器方向へのスワイプ→投げ入れ、
 * reveal ではタップ→確定。それ以外の phase では触れても何も起きない。
 */
export function resolveStageTouch(input: {
  phase: CompanionshipArPhase;
  start: PixelPoint;
  end: PixelPoint;
  stage: StageRect;
  canSwipe: boolean;
  throwTarget: PercentPoint;
  sightIsHit: boolean;
}): StageTouchDecision {
  const { phase, start, end, stage, canSwipe, throwTarget, sightIsHit } = input;
  if (phase !== "staging" && phase !== "reveal") return { type: "ignore" };
  if (stage.width <= 0 || stage.height <= 0) return { type: "ignore" };

  const distance = Math.hypot(end.x - start.x, end.y - start.y);

  if (phase === "reveal") {
    return distance < GACHA_SWIPE_MIN_DISTANCE_PX ? { type: "confirm" } : { type: "ignore" };
  }

  if (distance < GACHA_SWIPE_MIN_DISTANCE_PX) {
    if (sightIsHit) return { type: "ignore" };
    const point = percentPointFromClient(end.x, end.y, stage);
    return point ? { type: "aim", point } : { type: "ignore" };
  }

  if (!canSwipe) return { type: "ignore" };
  const target = clientPointFromPercent(throwTarget, stage);
  return isThrowSwipe(start, end, target) ? { type: "throw" } : { type: "ignore" };
}

/**
 * expo-sensors の accelerationIncludingGravity は「地球へ向かう」ベクトル
 * （iOS: userAcceleration + gravity、Android: accel - 2*gravity で符号を揃えてある）。
 * web の devicemotion が返す反力（上向き）とは逆符号なので、
 * domain の gravityUpVec / screenUpAngleDeg に渡す前に反転する。
 */
export function gravityAxisFromDeviceMotion(
  axis: { x: number; y: number; z: number } | null | undefined,
): GravityAxis | null {
  if (!axis) return null;
  return { x: -axis.x, y: -axis.y, z: -axis.z };
}
