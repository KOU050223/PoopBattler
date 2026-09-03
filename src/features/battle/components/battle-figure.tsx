"use client";

import { motion, useReducedMotion } from "framer-motion";

import {
  ATTRIBUTE_LABELS,
  scaleByBattleSpeed,
  type BattleSpeed,
  type CharacterAttribute,
} from "@/features/battle/battle.constants";
import { PoopmFigure } from "@/features/poopm/components/poopm-figure";
import { appearanceForCharacter } from "@/features/poopm/poopm.appearances";

export function BattleFigure({
  characterId,
  attribute,
  facing,
  motion: figureMotion,
  label,
  depth,
  speed,
  hitFlashKey,
}: {
  characterId: string;
  attribute: CharacterAttribute;
  facing: "front" | "back";
  motion: "idle" | "hit" | "attack";
  label: string;
  depth: "far" | "near";
  speed: BattleSpeed;
  hitFlashKey: number;
}) {
  const reduceMotion = useReducedMotion();
  const sizeClass = depth === "far" ? "h-20 w-20" : "h-32 w-32";
  const poopmMotion = figureMotion === "attack" ? "eat" : figureMotion;
  const hitTint = reduceMotion
    ? [
        "none",
        "brightness(1.08) sepia(0.6) saturate(2.2) hue-rotate(310deg)",
        "none",
      ]
    : [
        "none",
        "brightness(1.12) sepia(0.75) saturate(2.7) hue-rotate(310deg) drop-shadow(0 0 12px rgb(220 104 104 / 0.45))",
        "brightness(1.02) sepia(0.35) saturate(1.5) hue-rotate(315deg)",
        "brightness(1.1) sepia(0.65) saturate(2.3) hue-rotate(310deg) drop-shadow(0 0 8px rgb(220 104 104 / 0.35))",
        "none",
      ];

  return (
    <motion.div
      className="flex flex-col items-center gap-1"
      animate={
        figureMotion === "hit"
          ? { x: [0, -10, 10, -6, 0] }
          : figureMotion === "attack"
            ? { y: [0, -14, 0] }
            : { y: [0, -5, 0] }
      }
      transition={
        figureMotion === "idle"
          ? {
              repeat: Infinity,
              duration: scaleByBattleSpeed(2.2, speed),
              ease: "easeInOut",
            }
          : { duration: scaleByBattleSpeed(0.35, speed) }
      }
    >
      <motion.div
        key={`hit-flash-${hitFlashKey}`}
        className={sizeClass}
        animate={
          figureMotion === "hit"
            ? { filter: hitTint }
            : { filter: "none" }
        }
        transition={{
          duration: scaleByBattleSpeed(reduceMotion ? 0.18 : 0.42, speed),
          ease: "easeOut",
        }}
      >
        <PoopmFigure
          appearance={appearanceForCharacter(characterId)}
          facing={facing}
          motion={poopmMotion}
          label={label}
          className="h-full w-full"
        />
      </motion.div>
      <p className="max-w-28 truncate text-center text-[13px] font-medium text-pencil-gray">
        {label}
        <span className="block">{ATTRIBUTE_LABELS[attribute]}</span>
      </p>
    </motion.div>
  );
}
