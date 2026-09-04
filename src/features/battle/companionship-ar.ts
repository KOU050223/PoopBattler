import type { ToiletModelStatus, ToiletSight } from "@/features/battle/toilet-detection";
import type { UserMediaCameraStatus } from "@/lib/user-media-camera";

export type CompanionshipArPhase = "staging" | "throw" | "shake" | "reveal" | "summary";

export const REVEAL_SUCCESS_COPY = "成功";
export const REVEAL_FAIL_COPY = "失敗";

export const COMPANIONSHIP_PHASE_MS = {
  throw: 900,
  shake: 700,
  reveal: 2200,
} as const;

export const VIDEO_SHAKE_ANIMATE = {
  x: [0, -3, 4, -3, 2, -7, 8, -6, 5, 0],
  y: [0, 2, -2, 1, -2, 4, -5, 3, -3, 0],
  rotate: [0, -1.2, 1.2, -0.8, 0.6, -2.4, 2.2, -1.8, 1.4, 0],
} as const;

export const VIDEO_SHAKE_TRANSITION = {
  duration: 0.7,
  times: [0, 0.08, 0.16, 0.24, 0.32, 0.4, 0.5, 0.6, 0.7, 1],
  ease: "linear" as const,
};

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
  reduceMotion = false,
): CompanionshipArPhase {
  if (phase === "staging") {
    if (hasPhoto) return "throw";
    return reduceMotion ? "reveal" : "shake";
  }
  if (phase === "throw") return reduceMotion ? "reveal" : "shake";
  if (phase === "shake") return "reveal";
  return "summary";
}

export function companionshipPhaseDelay(
  phase: CompanionshipArPhase,
  reduceMotion: boolean,
): number | null {
  if (phase === "staging" || phase === "summary") return null;
  if (reduceMotion) return 0;
  if (phase === "throw") return COMPANIONSHIP_PHASE_MS.throw;
  if (phase === "shake") return COMPANIONSHIP_PHASE_MS.shake;
  return COMPANIONSHIP_PHASE_MS.reveal;
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
  if (input.acquired) return REVEAL_SUCCESS_COPY;
  if (input.usedMealLog) return REVEAL_FAIL_COPY;
  return "この回は仲間になりません。食事ログがないと、仲間化抽選は行いません。";
}
