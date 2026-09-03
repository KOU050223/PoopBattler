import type { TargetAndTransition, Transition } from "framer-motion";

import { scaleByBattleSpeed, type BattleSpeed } from "@/features/battle/battle.constants";

export type BattleFigureMotion = "idle" | "hit" | "attack";

export const battleFigureAnimate: Record<BattleFigureMotion, TargetAndTransition> = {
  idle: { x: 0, y: [0, -5, 0] },
  hit: { x: [0, -10, 10, -6, 0], y: 0 },
  attack: { x: 0, y: [0, -14, 0] },
};

export function battleFigureTransition(
  motion: BattleFigureMotion,
  speed: BattleSpeed,
): Transition {
  if (motion === "idle") {
    return {
      x: { duration: 0 },
      y: {
        repeat: Infinity,
        duration: scaleByBattleSpeed(2.2, speed),
        ease: "easeInOut",
      },
    };
  }

  return { duration: scaleByBattleSpeed(0.35, speed) };
}
