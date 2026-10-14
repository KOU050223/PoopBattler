export const GRAVITY_SCREEN_MIN = 3;
export const GRAVITY_SMOOTH = 0.15;

export type GravityAxis = {
  x: number | null;
  y: number | null;
  z?: number | null;
};

export type GravityVec3 = {
  x: number;
  y: number;
  z: number;
};

// accelerationIncludingGravity は重力の反力（=デバイスが感じる"上"）を返す
// （W3C: 画面を上に寝かせた端末で z=+9.81）。逆ベクトルを取ると上下逆になる
// ので、測定値をそのまま上方向として扱う。

/** 画面平面に落ちた「上」の角度。ノルムが小さい・欠損は画面上が上（0°）。 */
export function screenUpAngleDeg(gravity: GravityAxis | null | undefined): number {
  if (gravity == null || gravity.x == null || gravity.y == null) return 0;
  if (Math.hypot(gravity.x, gravity.y) < GRAVITY_SCREEN_MIN) return 0;
  return (Math.atan2(gravity.x, gravity.y) * 180) / Math.PI;
}

export function smoothAngleDeg(prev: number, next: number, alpha = GRAVITY_SMOOTH): number {
  let delta = next - prev;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return prev + delta * alpha;
}

/**
 * デバイス座標の重力ベクトル → カメラ空間での世界の上向き（床法線）。
 * デバイス座標（x=右, y=画面上方向, z=画面手前）と three.js のカメラ座標は
 * 一致する前提で、測定値（=反力）をそのまま正規化する。
 * ノルムが小さい・欠損は null（呼び出し側は恒等姿勢にフォールバック）。
 */
export function gravityUpVec(gravity: GravityAxis | null | undefined): GravityVec3 | null {
  if (gravity == null || gravity.x == null || gravity.y == null || gravity.z == null) {
    return null;
  }
  const norm = Math.hypot(gravity.x, gravity.y, gravity.z);
  if (norm < GRAVITY_SCREEN_MIN) return null;
  return { x: gravity.x / norm, y: gravity.y / norm, z: gravity.z / norm };
}

/** 生の重力ベクトルを成分ごとに平滑化する。欠損値は前回値を維持する。 */
export function smoothGravityVec3(
  prev: GravityVec3 | null,
  next: GravityAxis | null | undefined,
  alpha = GRAVITY_SMOOTH,
): GravityVec3 | null {
  if (next == null || next.x == null || next.y == null || next.z == null) return prev;
  if (prev == null) return { x: next.x, y: next.y, z: next.z };
  return {
    x: prev.x + (next.x - prev.x) * alpha,
    y: prev.y + (next.y - prev.y) * alpha,
    z: prev.z + (next.z - prev.z) * alpha,
  };
}
