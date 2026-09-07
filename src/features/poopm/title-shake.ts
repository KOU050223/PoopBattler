import {
  accelerationMagnitude,
  type DeviceMotionEventLike,
} from "@/lib/motion";

const LINEAR_SHAKE_THRESHOLD = 3.5;
const GRAVITY_MAGNITUDE = 9.80665;
const GRAVITY_SHAKE_DELTA_THRESHOLD = 2.5;

/**
 * タイトル画面用の単発シェイク判定。
 *
 * 端末ごとに `acceleration` の有無が異なるため、線形加速度を優先し、
 * 無い場合は重力込みの大きさが静止時から十分ずれたときだけ反応する。
 */
export function isTitleShake(event: DeviceMotionEventLike): boolean {
  const linearMagnitude = accelerationMagnitude(event.acceleration);
  if (linearMagnitude != null) {
    return linearMagnitude >= LINEAR_SHAKE_THRESHOLD;
  }

  const gravityMagnitude = accelerationMagnitude(event.accelerationIncludingGravity);
  return (
    gravityMagnitude != null &&
    Math.abs(gravityMagnitude - GRAVITY_MAGNITUDE) >= GRAVITY_SHAKE_DELTA_THRESHOLD
  );
}
