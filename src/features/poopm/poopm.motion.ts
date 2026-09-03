import type { TargetAndTransition, Transition } from "framer-motion";

import type { PoopmMotion } from "@/features/poopm/poopm.types";

const REST_TRANSFORM = {
  x: 0,
  y: 0,
  rotate: 0,
  scale: 1,
  scaleX: 1,
  scaleY: 1,
} as const;

function partPose(overrides: TargetAndTransition): TargetAndTransition {
  return { ...REST_TRANSFORM, ...overrides };
}

const idleTransition: Transition = {
  duration: 2.4,
  ease: "easeInOut",
  repeat: Infinity,
};

export const poopmMotionTransition: Record<PoopmMotion, Transition> = {
  idle: idleTransition,
  hit: idleTransition,
  eat: { duration: 0.42, ease: "easeInOut" },
};

const idleBody = partPose({ y: [0, 2, 0], scaleY: [1, 1.025, 1] });
const idleHead = partPose({ y: [0, -2, 0], rotate: [-2, 2, -2] });
const idleLimb = partPose({ y: [0, 1, 0], rotate: [0, -1, 0] });
const idleEyes = partPose({ scaleY: [1, 1, 0.12, 1, 1] });
const idleMouth = partPose({ y: [0, 1, 0] });

export const poopmBodyMotion: Record<PoopmMotion, TargetAndTransition> = {
  idle: idleBody,
  hit: idleBody,
  eat: partPose({ y: [0, -8, 2, 0], scaleY: [1, 0.96, 1.04, 1] }),
};

export const poopmHeadMotion: Record<PoopmMotion, TargetAndTransition> = {
  idle: idleHead,
  hit: idleHead,
  eat: partPose({ y: [0, -11, 0], rotate: [0, 5, -2, 0] }),
};

export const poopmLimbMotion: Record<PoopmMotion, TargetAndTransition> = {
  idle: idleLimb,
  hit: idleLimb,
  eat: partPose({ y: [0, -5, 0], rotate: [0, -7, 4, 0] }),
};

export const poopmEyesMotion: Record<PoopmMotion, TargetAndTransition> = {
  idle: idleEyes,
  hit: idleEyes,
  eat: partPose({ y: [0, -2, 0], scaleY: [1, 0.85, 1] }),
};

export const poopmMouthMotion: Record<PoopmMotion, TargetAndTransition> = {
  idle: idleMouth,
  hit: idleMouth,
  eat: partPose({ y: [0, -2, 0], scale: [1, 1.18, 0.96, 1] }),
};

export const POOPM_PART_MOTIONS = {
  body: poopmBodyMotion,
  head: poopmHeadMotion,
  limb: poopmLimbMotion,
  eyes: poopmEyesMotion,
  mouth: poopmMouthMotion,
} as const;
