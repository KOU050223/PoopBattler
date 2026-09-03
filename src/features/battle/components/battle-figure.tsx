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

export const CHARGE_SWIRL_PNG = "/assets/battle/charge-swirl.png";

function ChargeSwirl({ speed }: { speed: BattleSpeed }) {
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
