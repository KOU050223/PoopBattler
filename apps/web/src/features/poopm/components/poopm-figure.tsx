"use client";

import { motion } from "framer-motion";

import {
  BODY_PNG,
  EYES_PNG,
  HEAD_PNG,
  LIMBS_PNG,
  MOUTH_PNG,
} from "@/features/poopm/poopm.assets";
import {
  poopmBodyMotion,
  poopmEyesMotion,
  poopmHeadMotion,
  poopmLimbMotion,
  poopmMotionTransition,
  poopmMouthMotion,
} from "@/features/poopm/poopm.motion";
import type { PoopmFigureProps } from "@/features/poopm/poopm.types";

type PoopmFigureComponentProps = PoopmFigureProps & {
  className?: string;
  label?: string;
};

const BODY_SIZE = {
  width: 207,
  height: 220,
} as const;

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
  const transition = poopmMotionTransition[figureMotion];
  const isBack = facing === "back";

  return (
    <div
      role="img"
      aria-label={label}
      className={["relative aspect-[207/260] overflow-hidden", className]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="absolute inset-0 origin-top translate-y-[12%] scale-[0.7]">
        <motion.img
          src={BODY_PNG[appearance.color]}
          width={BODY_SIZE.width}
          height={BODY_SIZE.height}
          alt=""
          aria-hidden="true"
          draggable={false}
          className={partClass("left-[9%] top-[12%] z-20 w-[82%]")}
          initial={false}
          animate={poopmBodyMotion[figureMotion]}
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
          initial={false}
          animate={poopmLimbMotion[figureMotion]}
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
          initial={false}
          animate={poopmLimbMotion[figureMotion]}
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
          initial={false}
          animate={poopmLimbMotion[figureMotion]}
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
          initial={false}
          animate={poopmLimbMotion[figureMotion]}
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
          initial={false}
          animate={{
            ...poopmHeadMotion[figureMotion],
            scaleX: isBack ? -1 : 1,
          }}
          transition={transition}
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
              initial={false}
              animate={poopmMouthMotion[figureMotion]}
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
              initial={false}
              animate={poopmEyesMotion[figureMotion]}
              transition={
                figureMotion === "eat"
                  ? transition
                  : { ...transition, duration: 3.2, times: [0, 0.84, 0.88, 0.92, 1] }
              }
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
