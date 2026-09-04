"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import {
  OUTCOME_OVERLAY_DISMISS_LOCK_MS,
  isOutcomeOverlayDismissLocked,
} from "@/features/battle/battle-screen-view";
import { captionTextClass } from "@/lib/ui-classes";

export type BattleOutcome = "win" | "lose";

const WIN_CONFETTI = [
  { x: 12, delay: 0.02, color: "#ff7aac", w: 8, h: 10, rot: -18 },
  { x: 28, delay: 0.08, color: "#1cb0f6", w: 7, h: 12, rot: 14 },
  { x: 46, delay: 0.04, color: "#c94d7f", w: 9, h: 8, rot: -8 },
  { x: 62, delay: 0.12, color: "#ffffff", w: 6, h: 11, rot: 20 },
  { x: 78, delay: 0.06, color: "#ff7aac", w: 8, h: 9, rot: -22 },
  { x: 90, delay: 0.16, color: "#1cb0f6", w: 7, h: 10, rot: 10 },
] as const;

function WinConfetti({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <div aria-hidden="true" data-confetti="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {WIN_CONFETTI.map((piece, index) => (
        <motion.span
          key={index}
          className="absolute top-[-8%] rounded-sm"
          style={{
            left: `${piece.x}%`,
            width: piece.w,
            height: piece.h,
            backgroundColor: piece.color,
          }}
          initial={reduceMotion ? false : { y: "-8%", rotate: piece.rot, opacity: 1 }}
          animate={{ y: "118%", rotate: piece.rot + 90, opacity: 0.2 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 1.2, delay: piece.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

export function BattleOutcomeOverlay({
  outcome,
  onDismiss,
}: {
  outcome: BattleOutcome;
  onDismiss: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const isWin = outcome === "win";
  const title = isWin ? "勝利" : "敗北";
  const shownAtRef = useRef<number | null>(null);
  const [dismissLocked, setDismissLocked] = useState(true);

  useEffect(() => {
    shownAtRef.current = Date.now();
    const timer = window.setTimeout(() => {
      setDismissLocked(false);
    }, OUTCOME_OVERLAY_DISMISS_LOCK_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <button
      type="button"
      data-battle-outcome={outcome}
      aria-label={`${title}。タップしてつづける`}
      aria-disabled={dismissLocked}
      onClick={() => {
        const shownAt = shownAtRef.current;
        if (
          shownAt == null
          || isOutcomeOverlayDismissLocked(shownAt, Date.now())
        ) {
          return;
        }
        onDismiss();
      }}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 px-6 ${
        isWin ? "bg-blush-wash/95" : "bg-night-ink/94"
      }`}
    >
      {isWin ? <WinConfetti reduceMotion={Boolean(reduceMotion)} /> : null}
      <motion.p
        className={`relative text-[48px] font-black leading-[1.2] tracking-[-0.02em] ${
          isWin ? "text-flush-pink" : "text-paper-white"
        }`}
        initial={reduceMotion ? false : { scale: 0.82, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 18 }}
      >
        {title}
      </motion.p>
      <p className={`relative ${captionTextClass} ${isWin ? "" : "text-cotton-pink"}`}>
        タップしてつづける
      </p>
    </button>
  );
}
