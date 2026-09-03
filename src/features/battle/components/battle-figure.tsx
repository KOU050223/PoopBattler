"use client";

import { motion } from "framer-motion";

import {
  battleFigureAnimate,
  battleFigureTransition,
} from "@/features/battle/battle-figure.motion";
import {
  ATTRIBUTE_LABELS,
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
}: {
  characterId: string;
  attribute: CharacterAttribute;
  facing: "front" | "back";
  motion: "idle" | "hit" | "attack";
  label: string;
  depth: "far" | "near";
  speed: BattleSpeed;
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
      <PoopmFigure
        appearance={appearanceForCharacter(characterId)}
        facing={facing}
        motion={poopmMotion}
        label={label}
        className={sizeClass}
      />
      <p className="max-w-28 truncate text-center text-[13px] font-medium text-pencil-gray">
        {label}
        <span className="block">{ATTRIBUTE_LABELS[attribute]}</span>
      </p>
    </motion.div>
  );
}
