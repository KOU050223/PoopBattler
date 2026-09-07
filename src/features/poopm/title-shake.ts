import {
  accelerationMagnitude,
  type DeviceMotionEventLike,
} from "@/lib/motion";

const LINEAR_SHAKE_THRESHOLD = 3.5;
const GRAVITY_MAGNITUDE = 9.80665;
const GRAVITY_SHAKE_DELTA_THRESHOLD = 1.8;

/**
 * タイトル画面用の単発シェイク判定。
 *
 * Android の一部は `acceleration` を常にゼロで返すため、線形加速度と
 * 重力込みの加速度のどちらでも反応できるようにする。重力込みの値は
 * 静止時の重力から十分ずれたときだけ扱い、持っただけでは反応させない。
 */
export function isTitleShake(event: DeviceMotionEventLike): boolean {
  const linearMagnitude = accelerationMagnitude(event.acceleration);
  const gravityMagnitude = accelerationMagnitude(event.accelerationIncludingGravity);
  const hasLinearShake =
    linearMagnitude != null && linearMagnitude >= LINEAR_SHAKE_THRESHOLD;
  const hasGravityShake =
    gravityMagnitude != null &&
    Math.abs(gravityMagnitude - GRAVITY_MAGNITUDE) >= GRAVITY_SHAKE_DELTA_THRESHOLD;

  return hasLinearShake || hasGravityShake;
}
