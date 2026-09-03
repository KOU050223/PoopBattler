"use client";

import { useSpecialMotion } from "@/features/battle/hooks/use-special-motion";
import {
  SPECIAL_GAUGE_MAX,
  type BattleStance,
} from "@/features/battle/battle.constants";
import type { BattleParty } from "@/features/battle/battle.types";

function controlClass(active: boolean, disabled: boolean) {
  if (disabled) {
    return "rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-400 dark:border-zinc-800";
  }
  if (active) {
    return "rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900";
  }
  return "rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700";
}

export function BattleControls({
  party,
  activeIndex,
  playerStance,
  playerGauge,
  playerGuardCooldownTicks,
  switchStunTicks,
  onFight,
  onGuard,
  onSwitch,
  onDebugStrain,
  onDebugComplete,
}: {
  party: BattleParty;
  activeIndex: number;
  playerStance: BattleStance;
  playerGauge: number;
  playerGuardCooldownTicks: number;
  switchStunTicks: number;
  onFight: () => void;
  onGuard: () => void;
  onSwitch: (index: number) => void;
  onDebugStrain?: () => void;
  onDebugComplete?: () => void;
}) {
  const { reason, activateSpecial } = useSpecialMotion();
  const stunned = switchStunTicks > 0;
  const specialReady = playerGauge >= SPECIAL_GAUGE_MAX && !stunned;
  const guardBlocked = playerGuardCooldownTicks > 0 || playerStance === "guard" || stunned;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          className={controlClass(playerStance === "fight", stunned)}
          disabled={stunned}
          onClick={onFight}
        >
          たたかえ
        </button>
        <button
          type="button"
          className={controlClass(playerStance === "guard", guardBlocked)}
          disabled={guardBlocked}
          onClick={onGuard}
        >
          まもれ
        </button>
        <button
          type="button"
          className={controlClass(playerStance === "special", !specialReady)}
          disabled={!specialReady}
          onClick={activateSpecial}
        >
          必殺
        </button>
      </div>
      {reason ? (
        <p role="status" className="text-center text-xs text-zinc-600 dark:text-zinc-400">
          {reason}
        </p>
      ) : null}
      {process.env.NODE_ENV === "development" ? (
        <div className="flex flex-col gap-2">
          {onDebugStrain ? (
            <button
              type="button"
              className={controlClass(playerStance === "special", playerStance !== "special")}
              disabled={playerStance !== "special"}
              onClick={onDebugStrain}
            >
              踏ん張る（デバッグ）
            </button>
          ) : null}
          {onDebugComplete ? (
            <button
              type="button"
              className={controlClass(false, false)}
              onClick={onDebugComplete}
            >
              即完了（デバッグ）
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        {party.map((member, index) => {
          if (index === activeIndex) {
            return null;
          }
          const down = member.hp <= 0;
          return (
            <button
              key={`${member.characterId}-${index}`}
              type="button"
              disabled={down || stunned}
              onClick={() => onSwitch(index)}
              className={controlClass(false, down || stunned)}
            >
              交代 {member.name ?? `控え${index + 1}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}
