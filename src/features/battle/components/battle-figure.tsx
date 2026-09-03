"use client";

import { motion, useReducedMotion } from "framer-motion";

import {
  battleFigureAnimate,
  battleFigureTransition,
} from "@/features/battle/battle-figure.motion";
import {
  ATTRIBUTE_LABELS,
  scaleByBattleSpeed,
  type BattleSpeed,
  type CharacterAttribute,
} from "@/features/battle/battle.constants";
import { PoopmFigure } from "@/features/poopm/components/poopm-figure";
import { appearanceForCharacter } from "@/features/poopm/poopm.appearances";

function ChargeSwirl({ speed }: { speed: BattleSpeed }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute -inset-4 z-0"
      initial={false}
      animate={
        reduceMotion
          ? { opacity: 0.72, scale: 1 }
          : { opacity: [0.5, 0.9, 0.5], rotate: 360, scale: [0.98, 1.04, 0.98] }
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
              scale: {
                duration: scaleByBattleSpeed(1.15, speed),
                repeat: Infinity,
                ease: "easeInOut",
              },
            }
      }
    >
      <div className="absolute inset-1 rounded-full border-4 border-transparent border-t-night-ink border-r-flush-pink opacity-75" />
      <div className="absolute inset-4 rounded-full border-4 border-transparent border-b-spark-blue border-l-cotton-pink opacity-70" />
      <div className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full bg-flush-pink" />
      <div className="absolute bottom-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-spark-blue" />
    </motion.div>
  );
}

export function BattleFigure({
  characterId,
  attribute,
  facing,
  motion: figureMotion,
  label,
  depth,
  speed,
  charging = false,
}: {
  characterId: string;
  attribute: CharacterAttribute;
  facing: "front" | "back";
  motion: "idle" | "hit" | "attack";
  label: string;
  depth: "far" | "near";
  speed: BattleSpeed;
  charging?: boolean;
}) {
  const sizeClass = depth === "far" ? "h-20 w-20" : "h-32 w-32";
  const poopmMotion = figureMotion === "attack" ? "eat" : figureMotion;

  return (
    <motion.div
      className="flex flex-col items-center gap-1"
      initial={false}
      animate={battleFigureAnimate[figureMotion]}
      transition={battleFigureTransition(figureMotion, speed)}
    >
      <div className="relative">
        {charging ? <ChargeSwirl speed={speed} /> : null}
        <PoopmFigure
          appearance={appearanceForCharacter(characterId)}
          facing={facing}
          motion={poopmMotion}
          label={label}
          className={`relative z-10 ${sizeClass}`}
        />
      </div>
      <p className="max-w-28 truncate text-center text-[13px] font-medium text-pencil-gray">
        {label}
        <span className="block">{ATTRIBUTE_LABELS[attribute]}</span>
      </p>
    </motion.div>
  );
}
