"use client";

import { motion, useReducedMotion } from "framer-motion";

import {
  scaleByBattleSpeed,
  type BattleSpeed,
} from "@/features/battle/battle.constants";

export const CHARGE_SWIRL_PNG = "/assets/battle/charge-swirl.png";

export function ChargeSwirl({ speed }: { speed: BattleSpeed }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute -inset-8 z-0"
      initial={false}
      animate={
        reduceMotion
          ? { opacity: 0.85, rotate: 0 }
          : { opacity: [0.7, 1, 0.7], rotate: 360 }
      }
      transition={
        reduceMotion
          ? { duration: 0 }
          : {
              opacity: {
                duration: scaleByBattleSpeed(1.15, speed),
                repeat: Infinity,
                ease: "easeInOut",
              },
              rotate: {
                duration: scaleByBattleSpeed(1.35, speed),
                repeat: Infinity,
                ease: "linear",
              },
            }
      }
    >
      <img
        src={CHARGE_SWIRL_PNG}
        alt=""
        draggable={false}
        className="h-full w-full object-contain mix-blend-screen"
      />
    </motion.div>
  );
}
