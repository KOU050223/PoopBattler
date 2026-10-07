// TODO(T-003マージ後): domain/motion 側の MotionPermission（元 lib/motion）へ統合する。
type MotionPermission = "unsupported" | "prompt" | "granted" | "denied";

export type SpecialMotionPlan = "noop" | "listen" | "fire-now";

export function planSpecialMotion(input: {
  permission: MotionPermission;
  enteredSpecial: boolean;
}): SpecialMotionPlan {
  if (!input.enteredSpecial) {
    return "noop";
  }

  if (input.permission === "granted") {
    return "listen";
  }

  if (input.permission === "prompt") {
    return "noop";
  }

  return "fire-now";
}
