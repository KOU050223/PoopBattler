export const TOILET_CLASS = "toilet";
export const TOILET_ACCEPT_SCORE = 0.5;
export const TOILET_DEBUG_SCORE = 0.15;
export const TOILET_INFER_INTERVAL_MS = 450;
export const TOILET_SEAT_BIAS = 0.68;

export type CocoDetection = {
  bbox: [number, number, number, number];
  class: string;
  score: number;
};

export type ToiletModelStatus = "idle" | "loading" | "ready" | "failed";

export type OverlayBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
};

export type ToiletSight =
  | { kind: "none" }
  | { kind: "low"; box: OverlayBox; target: PercentPoint }
  | { kind: "hit"; box: OverlayBox; target: PercentPoint };

export type PercentPoint = {
  x: number;
  y: number;
};

export const DEFAULT_THROW_TARGET: PercentPoint = { x: 50, y: 72 };

export function pickToiletDetection(detections: readonly CocoDetection[]): CocoDetection | null {
  let best: CocoDetection | null = null;
  for (const detection of detections) {
    if (detection.class !== TOILET_CLASS) continue;
    if (detection.score < TOILET_DEBUG_SCORE) continue;
    if (!best || detection.score > best.score) best = detection;
  }
  return best;
}

export function toiletSightFromDetection(
  detection: CocoDetection | null,
  box: OverlayBox | null,
  displayWidth: number,
  displayHeight: number,
): ToiletSight {
  if (!detection || !box) return { kind: "none" };
  const target = seatBiasedTarget(box, displayWidth, displayHeight);
  if (detection.score >= TOILET_ACCEPT_SCORE) return { kind: "hit", box, target };
  return { kind: "low", box, target };
}

/**
 * object-fit: cover の表示枠へ、映像解像度の bbox を写す。
 * CSS ピクセルと映像ピクセルを同じとみなすと、検出枠が映像の余白側へずれる。
 */
export function mapCoverBBox(
  bbox: readonly [number, number, number, number],
  videoWidth: number,
  videoHeight: number,
  displayWidth: number,
  displayHeight: number,
): OverlayBox | null {
  if (videoWidth <= 0 || videoHeight <= 0 || displayWidth <= 0 || displayHeight <= 0) {
    return null;
  }

  const scale = Math.max(displayWidth / videoWidth, displayHeight / videoHeight);
  const drawnWidth = videoWidth * scale;
  const drawnHeight = videoHeight * scale;
  const offsetX = (displayWidth - drawnWidth) / 2;
  const offsetY = (displayHeight - drawnHeight) / 2;
  const [x, y, width, height] = bbox;

  return {
    x: x * scale + offsetX,
    y: y * scale + offsetY,
    width: width * scale,
    height: height * scale,
    score: 0,
  };
}

export function overlayBoxFromDetection(
  detection: CocoDetection,
  videoWidth: number,
  videoHeight: number,
  displayWidth: number,
  displayHeight: number,
): OverlayBox | null {
  const mapped = mapCoverBBox(
    detection.bbox,
    videoWidth,
    videoHeight,
    displayWidth,
    displayHeight,
  );
  if (!mapped) return null;
  return { ...mapped, score: detection.score };
}

export function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

export function percentPointFromClient(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
): PercentPoint | null {
  if (rect.width <= 0 || rect.height <= 0) return null;
  return {
    x: clampPercent(((clientX - rect.left) / rect.width) * 100),
    y: clampPercent(((clientY - rect.top) / rect.height) * 100),
  };
}

export function seatBiasedTarget(box: OverlayBox, displayWidth: number, displayHeight: number): PercentPoint {
  if (displayWidth <= 0 || displayHeight <= 0) return DEFAULT_THROW_TARGET;
  return {
    x: clampPercent(((box.x + box.width / 2) / displayWidth) * 100),
    y: clampPercent(((box.y + box.height * TOILET_SEAT_BIAS) / displayHeight) * 100),
  };
}

export function resolveThrowTarget(input: {
  sight: ToiletSight;
  tap: PercentPoint | null;
}): PercentPoint {
  if (input.sight.kind === "hit") return input.sight.target;
  if (input.tap) return input.tap;
  return DEFAULT_THROW_TARGET;
}

export function toiletDebugCopy(
  modelStatus: ToiletModelStatus,
  sight: ToiletSight,
  swipePrompt = false,
): string | null {
  if (modelStatus === "loading") return "便器を探しています";
  if (modelStatus === "failed") {
    return swipePrompt
      ? "便器の自動検出が使えません。画面をタップして投げ入れ先を決め、スワイプしてください。"
      : "便器の自動検出が使えません。画面をタップして投げ入れ先を決められます。";
  }
  if (modelStatus !== "ready") return null;
  if (sight.kind === "hit") {
    const detected = `便器を検出 ${Math.round(sight.box.score * 100)}%`;
    return swipePrompt ? `${detected}。スワイプして投げ入れてください` : detected;
  }
  if (sight.kind === "low") {
    const maybe = `便器かも… ${Math.round(sight.box.score * 100)}%`;
    return swipePrompt ? `${maybe}。タップで投げ入れ先を決めて、スワイプしてください` : maybe;
  }
  return swipePrompt
    ? "便器が見つかりません。画面をタップして投げ入れ先を決め、スワイプしてください。"
    : "便器が見つかりません。画面をタップして投げ入れ先を決められます。";
}
