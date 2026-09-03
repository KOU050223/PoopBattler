"use client";

import { motion } from "framer-motion";

import {
  ATTRIBUTE_LABELS,
  type CharacterAttribute,
} from "@/features/battle/battle.constants";

const ATTRIBUTE_COLORS: Record<CharacterAttribute, string> = {
  spicy: "#dc2626",
  meat: "#b45309",
  vegetable: "#16a34a",
  dairy: "#38bdf8",
  sweet: "#ec4899",
  curry: "#ca8a04",
  normal: "#78716c",
};

export function BattleFigure({
  attribute,
  facing,
  motion: figureMotion,
  label,
}: {
  attribute: CharacterAttribute;
  facing: "front" | "back";
  motion: "idle" | "hit" | "attack";
  label: string;
}) {
  const color = ATTRIBUTE_COLORS[attribute];

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
          ? { repeat: Infinity, duration: 2.2, ease: "easeInOut" }
          : { duration: 0.35 }
      }
    >
      <svg
        viewBox="0 0 72 80"
        className="h-24 w-24"
        aria-hidden="true"
        style={{ transform: facing === "back" ? "scaleX(-1)" : undefined }}
      >
        <ellipse cx="36" cy="62" rx="18" ry="10" fill={color} opacity="0.95" />
        <ellipse cx="36" cy="48" rx="22" ry="13" fill={color} />
        <ellipse cx="36" cy="32" rx="16" ry="12" fill={color} />
        {facing === "front" ? (
          <>
            <circle cx="30" cy="32" r="2.5" fill="#171717" />
            <circle cx="42" cy="32" r="2.5" fill="#171717" />
            <path
              d="M30 40c4 4 8 4 12 0"
              fill="none"
              stroke="#171717"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </>
        ) : null}
        <line x1="18" y1="50" x2="6" y2="42" stroke="#171717" strokeWidth="1.6" />
        <line x1="54" y1="50" x2="66" y2="42" stroke="#171717" strokeWidth="1.6" />
        <line x1="28" y1="70" x2="24" y2="80" stroke="#171717" strokeWidth="1.6" />
        <line x1="44" y1="70" x2="48" y2="80" stroke="#171717" strokeWidth="1.6" />
      </svg>
      <p className="max-w-28 truncate text-center text-xs text-zinc-600 dark:text-zinc-400">
        {label}
        <span className="block">{ATTRIBUTE_LABELS[attribute]}</span>
      </p>
    </motion.div>
  );
}
