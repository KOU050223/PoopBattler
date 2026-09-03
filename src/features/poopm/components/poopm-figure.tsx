"use client";

import { motion, type TargetAndTransition, type Transition } from "framer-motion";

import {
  BODY_PNG,
  EYES_PNG,
  HEAD_PNG,
  LIMBS_PNG,
  MOUTH_PNG,
} from "@/features/poopm/poopm.assets";
import type { PoopmFigureProps, PoopmMotion } from "@/features/poopm/poopm.types";

type PoopmFigureComponentProps = PoopmFigureProps & {
  className?: string;
  label?: string;
};

const BODY_SIZE = {
  width: 207,
  height: 220,
} as const;

const motionTransition: Record<PoopmMotion, Transition> = {
  idle: { duration: 2.4, ease: "easeInOut", repeat: Infinity },
  hit: { duration: 0.34, ease: "easeOut" },
  eat: { duration: 0.42, ease: "easeInOut" },
};

const bodyMotion: Record<PoopmMotion, TargetAndTransition> = {
  idle: { y: [0, 2, 0], scaleY: [1, 1.025, 1] },
  hit: { x: [0, -7, 8, -4, 0], rotate: [0, -3, 3, -1, 0] },
  eat: { y: [0, -8, 2, 0], scaleY: [1, 0.96, 1.04, 1] },
};

const headMotion: Record<PoopmMotion, TargetAndTransition> = {
  idle: { y: [0, -2, 0], rotate: [-2, 2, -2] },
  hit: { x: [0, -8, 7, 0], rotate: [0, -9, 8, 0] },
  eat: { y: [0, -11, 0], rotate: [0, 5, -2, 0] },
};

const limbMotion: Record<PoopmMotion, TargetAndTransition> = {
  idle: { y: [0, 1, 0], rotate: [0, -1, 0] },
  hit: { x: [0, -5, 5, 0], rotate: [0, 7, -6, 0] },
  eat: { y: [0, -5, 0], rotate: [0, -7, 4, 0] },
};

const eyesMotion: Record<PoopmMotion, TargetAndTransition> = {
  idle: { scaleY: [1, 1, 0.12, 1, 1] },
  hit: { x: [0, -3, 3, 0], scaleY: [1, 0.65, 1] },
  eat: { y: [0, -2, 0], scaleY: [1, 0.85, 1] },
};

const mouthMotion: Record<PoopmMotion, TargetAndTransition> = {
  idle: { y: [0, 1, 0] },
  hit: { x: [0, 3, -3, 0], scaleX: [1, 0.9, 1] },
  eat: { y: [0, -2, 0], scale: [1, 1.18, 0.96, 1] },
};

function partClass(className: string) {
  return `absolute select-none object-contain ${className}`;
}

export function PoopmFigure({
  appearance,
  facing,
  motion: figureMotion,
  className,
  label = "うんちくん",
}: PoopmFigureComponentProps) {
  const transition = motionTransition[figureMotion];
  const isBack = facing === "back";

  return (
    <div
      role="img"
      aria-label={label}
      className={["relative aspect-[207/260] overflow-visible", className]
        .filter(Boolean)
        .join(" ")}
    >
      <motion.img
        src={BODY_PNG[appearance.color]}
        width={BODY_SIZE.width}
        height={BODY_SIZE.height}
        alt=""
        aria-hidden="true"
        draggable={false}
        className={partClass("left-[9%] top-[12%] z-20 w-[82%]")}
        animate={bodyMotion[figureMotion]}
        transition={transition}
      />
      <motion.img
        src={LIMBS_PNG.rightLeg}
        width={91}
        height={200}
        alt=""
        aria-hidden="true"
        draggable={false}
        className={partClass("bottom-[-22%] left-[25%] z-10 h-[47%] w-auto origin-top")}
        animate={limbMotion[figureMotion]}
        transition={transition}
      />
      <motion.img
        src={LIMBS_PNG.leftLeg}
        width={97}
        height={201}
        alt=""
        aria-hidden="true"
        draggable={false}
        className={partClass("right-[25%] bottom-[-22%] z-10 h-[46%] w-auto origin-top")}
        animate={limbMotion[figureMotion]}
        transition={transition}
      />
      <motion.img
        src={LIMBS_PNG.rightHand}
        width={133}
        height={172}
        alt=""
        aria-hidden="true"
        draggable={false}
        className={partClass("left-[-18%] top-[36%] z-10 w-[46%] origin-bottom")}
        animate={limbMotion[figureMotion]}
        transition={transition}
      />
      <motion.img
        src={LIMBS_PNG.leftHand}
        width={143}
        height={168}
        alt=""
        aria-hidden="true"
        draggable={false}
        className={partClass("right-[-18%] top-[36%] z-10 w-[47%] origin-bottom")}
        animate={limbMotion[figureMotion]}
        transition={transition}
      />
      <motion.img
        src={HEAD_PNG[appearance.head]}
        width={108}
        height={80}
        alt=""
        aria-hidden="true"
        draggable={false}
        className={partClass("left-[31%] top-[0%] z-30 w-[38%] origin-bottom")}
        animate={headMotion[figureMotion]}
        transition={transition}
        style={{ scaleX: isBack ? -1 : 1 }}
      />
      {!isBack ? (
        <>
          <motion.img
            src={MOUTH_PNG[appearance.mouth]}
            width={80}
            height={60}
            alt=""
            aria-hidden="true"
            draggable={false}
            className={partClass("left-[35%] top-[68%] z-40 w-[30%] origin-center")}
            animate={mouthMotion[figureMotion]}
            transition={transition}
          />
          <motion.img
            src={EYES_PNG[appearance.eyes]}
            width={128}
            height={87}
            alt=""
            aria-hidden="true"
            draggable={false}
            className={partClass("left-[29%] top-[39%] z-50 w-[42%] origin-center")}
            animate={eyesMotion[figureMotion]}
            transition={
              figureMotion === "idle"
                ? { ...transition, duration: 3.2, times: [0, 0.84, 0.88, 0.92, 1] }
                : transition
            }
          />
        </>
      ) : null}
    </div>
  );
}
