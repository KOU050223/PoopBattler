import type { ToiletModelStatus, ToiletSight } from "@/features/battle/toilet-detection";
import type { UserMediaCameraStatus } from "@/lib/user-media-camera";

export type CompanionshipArPhase = "staging" | "throw" | "reveal" | "summary";

export const GACHA_SWIPE_MIN_DISTANCE_PX = 56;
const GACHA_SWIPE_MAX_ANGLE_RAD = (65 * Math.PI) / 180;
const GACHA_SWIPE_NEAR_TARGET_PX = 24;

export type PixelPoint = {
  x: number;
  y: number;
};

export function usesCompanionshipAr(result: { usedMealLog: boolean }) {
  return result.usedMealLog;
}

export function shouldPlayThrow(photoId: string | null | undefined) {
  return Boolean(photoId);
}

export function shouldCrawlOut(acquiredCharacter: { id: string } | null | undefined) {
  return acquiredCharacter != null;
}

export function isLiveCameraOverlay(status: UserMediaCameraStatus) {
  return status === "ready" || status === "starting";
}

export function isCameraFallback(status: UserMediaCameraStatus) {
  return (
    status === "insecure"
    || status === "unsupported"
    || status === "denied"
    || status === "busy"
    || status === "unavailable"
    || status === "error"
  );
}

export function canAdvanceFromStaging(status: UserMediaCameraStatus) {
  return status === "ready" || isCameraFallback(status);
}

/** 便器 hit、または検出できないときにタップで投げ入れ先を決めたあとだけ、スワイプで開始できる。 */
export function canStartGachaBySwipe(input: {
  phase: CompanionshipArPhase;
  cameraStatus: UserMediaCameraStatus;
  modelStatus: ToiletModelStatus;
  sight: ToiletSight;
  hasAimPoint: boolean;
}) {
  if (input.phase !== "staging") return false;
  if (!canAdvanceFromStaging(input.cameraStatus)) return false;
  if (input.sight.kind === "hit") return true;
  if (input.modelStatus === "loading" || input.modelStatus === "idle") return false;
  return input.hasAimPoint;
}

export function clientPointFromPercent(
  point: { x: number; y: number },
  rect: { left: number; top: number; width: number; height: number },
): PixelPoint {
  return {
    x: rect.left + (point.x / 100) * rect.width,
    y: rect.top + (point.y / 100) * rect.height,
  };
}

export function isThrowSwipe(start: PixelPoint, end: PixelPoint, target: PixelPoint) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const swipeLen = Math.hypot(dx, dy);
  if (swipeLen < GACHA_SWIPE_MIN_DISTANCE_PX) return false;

  const toTargetX = target.x - start.x;
  const toTargetY = target.y - start.y;
  const toTargetLen = Math.hypot(toTargetX, toTargetY);
  if (toTargetLen < GACHA_SWIPE_NEAR_TARGET_PX) return dy > 0;

  const cos = (dx * toTargetX + dy * toTargetY) / (swipeLen * toTargetLen);
  return cos >= Math.cos(GACHA_SWIPE_MAX_ANGLE_RAD);
}

export function nextCompanionshipArPhase(
  phase: CompanionshipArPhase,
  hasPhoto: boolean,
): CompanionshipArPhase {
  if (phase === "staging") return hasPhoto ? "throw" : "reveal";
  if (phase === "throw") return "reveal";
  return "summary";
}

export function gachaCameraStatusMessage(status: UserMediaCameraStatus): string | null {
  switch (status) {
    case "starting":
      return "カメラを起動しています";
    case "insecure":
      return "カメラはHTTPS環境でのみ利用できます。静止背景で結果を表示します。";
    case "unsupported":
      return "このブラウザはカメラに対応していません。静止背景で結果を表示します。";
    case "denied":
      return "カメラの利用が許可されませんでした。静止背景で結果を表示します。";
    case "busy":
      return "カメラは他のアプリで使用中です。静止背景で結果を表示します。";
    case "unavailable":
      return "利用できるカメラが見つかりませんでした。静止背景で結果を表示します。";
    case "error":
      return "カメラを起動できませんでした。静止背景で結果を表示します。";
    default:
      return null;
  }
}

export function companionshipRevealCopy(input: {
  acquired: boolean;
  usedMealLog: boolean;
}) {
  if (input.acquired) return "便器から這い出てきた";
  if (input.usedMealLog) {
    return "今回は仲間になりませんでした。仲間化抽選は確定済みのため、再抽選はできません。";
  }
  return "この回は仲間になりません。食事ログがないと、仲間化抽選は行いません。";
}
