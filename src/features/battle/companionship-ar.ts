import type { UserMediaCameraStatus } from "@/lib/user-media-camera";

export type CompanionshipArPhase = "staging" | "throw" | "reveal" | "summary";

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
