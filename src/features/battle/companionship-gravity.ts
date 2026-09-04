export const GRAVITY_SCREEN_MIN = 3;
export const GRAVITY_SMOOTH = 0.15;

export type GravityAxis = {
  x: number | null;
  y: number | null;
  z?: number | null;
};

/** 画面平面に落ちた重力の逆向き。ノルムが小さい・欠損は画面上が上（0°）。 */
export function screenUpAngleDeg(gravity: GravityAxis | null | undefined): number {
  if (gravity == null || gravity.x == null || gravity.y == null) return 0;
  if (Math.hypot(gravity.x, gravity.y) < GRAVITY_SCREEN_MIN) return 0;
  return (Math.atan2(-gravity.x, -gravity.y) * 180) / Math.PI;
}

export function smoothAngleDeg(prev: number, next: number, alpha = GRAVITY_SMOOTH): number {
  let delta = next - prev;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return prev + delta * alpha;
}
