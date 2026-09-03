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
  const hitFlashOpacity = reduceMotion
    ? [0, 0.24, 0]
    : [0, 0.3, 0.08, 0.24, 0];
  const hitGlowOpacity = reduceMotion
    ? [0, 0.35, 0]
    : [0, 0.7, 0.2, 0.55, 0];

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
      <div className={`relative ${sizeClass}`}>
        {figureMotion === "hit" ? (
          <motion.div
            key={`hit-glow-${hitFlashKey}`}
            aria-hidden="true"
            className="pointer-events-none absolute inset-[-8%] z-0 rounded-full bg-danger-edge/45 blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: hitGlowOpacity }}
            transition={{
              duration: scaleByBattleSpeed(reduceMotion ? 0.18 : 0.42, speed),
              ease: "easeOut",
            }}
          />
        ) : null}
        <div className="relative z-10 h-full w-full">
          <PoopmFigure
            appearance={appearanceForCharacter(characterId)}
            facing={facing}
            motion={poopmMotion}
            label={label}
            className="h-full w-full"
          />
          {figureMotion === "hit" ? (
            <motion.div
              key={`hit-flash-${hitFlashKey}`}
              aria-hidden="true"
              className="pointer-events-none absolute inset-[4%] z-[60] rounded-[45%] bg-danger-edge"
              initial={{ opacity: 0 }}
              animate={{ opacity: hitFlashOpacity }}
              transition={{
                duration: scaleByBattleSpeed(reduceMotion ? 0.18 : 0.42, speed),
                ease: "easeOut",
              }}
            />
          ) : null}
        </div>
      </div>
      <p className="max-w-28 truncate text-center text-[13px] font-medium text-pencil-gray">
        {label}
        <span className="block">{ATTRIBUTE_LABELS[attribute]}</span>
      </p>
    </motion.div>
  );
}
