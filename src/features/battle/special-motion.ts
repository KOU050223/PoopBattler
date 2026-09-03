import type { MotionPermission } from "@/lib/motion";

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
