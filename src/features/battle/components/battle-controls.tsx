"use client";

import {
  SPECIAL_GAUGE_MAX,
  TICK_INTERVAL_MS,
  type BattleStance,
} from "@/features/battle/battle.constants";
import type { BattleParty } from "@/features/battle/battle.types";
import {
  captionTextClass,
  secondaryButtonClass,
  specialButtonClass,
  stancePillClass,
} from "@/lib/ui-classes";

function controlClass(kind: "stance" | "special", active: boolean, disabled: boolean) {
  if (kind === "special" && active && !disabled) {
    return specialButtonClass;
  }
  return stancePillClass(active, disabled);
}

export function BattleControls({
  party,
  activeIndex,
  playerStance,
  playerGauge,
  playerGuardCooldownTicks,
  switchStunTicks,
  switchCooldownTicks,
  onGuard,
  onSpecial,
  onSwitch,
  specialReason,
  onDebugStrain,
  onDebugComplete,
  onDebugDefeat,
}: {
  party: BattleParty;
  activeIndex: number;
  playerStance: BattleStance;
  playerGauge: number;
  playerGuardCooldownTicks: number;
  switchStunTicks: number;
  switchCooldownTicks: number;
  onGuard: () => void;
  onSpecial: () => void;
  onSwitch: (index: number) => void;
  specialReason?: string | null;
  onDebugStrain?: () => void;
  onDebugComplete?: () => void;
  onDebugDefeat?: () => void;
}) {
  const stunned = switchStunTicks > 0;
  const switchLocked = stunned || switchCooldownTicks > 0;
  const switchWaitSeconds = Math.ceil(
    ((switchStunTicks + switchCooldownTicks) * TICK_INTERVAL_MS) / 1000,
  );
  const specialReady = playerGauge >= SPECIAL_GAUGE_MAX && !stunned;
  const guardBlocked = playerGuardCooldownTicks > 0 || playerStance === "guard" || stunned;

  return (
    <div className="flex flex-col gap-3 pb-2">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className={controlClass("stance", playerStance === "guard", guardBlocked)}
          disabled={guardBlocked}
          onClick={onGuard}
        >
          まもれ
        </button>
        <button
          type="button"
          className={controlClass("special", playerStance === "special", !specialReady)}
          disabled={!specialReady}
          onClick={onSpecial}
        >
          必殺
        </button>
      </div>
      {specialReason ? (
        <p role="status" className={`text-center ${captionTextClass}`}>
          {specialReason}
        </p>
      ) : null}
      {process.env.NODE_ENV === "development" ? (
        <div className="flex flex-col gap-2">
          {onDebugStrain ? (
            <button
              type="button"
              className={controlClass("special", playerStance === "special", playerStance !== "special")}
              disabled={playerStance !== "special"}
              onClick={onDebugStrain}
            >
              踏ん張る（デバッグ）
            </button>
          ) : null}
          {onDebugComplete ? (
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={onDebugComplete}
            >
              即完了（デバッグ）
            </button>
          ) : null}
          {onDebugDefeat ? (
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={onDebugDefeat}
            >
              即敗北（デバッグ）
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        {party.map((member, index) => {
          if (index === activeIndex) {
            return null;
          }
          const down = member.hp <= 0;
          const hpRatio = member.maxHp > 0 ? Math.max(0, member.hp / member.maxHp) : 0;
          const blocked = down || switchLocked;
          return (
            <button
              key={`${member.characterId}-${index}`}
              type="button"
              disabled={blocked}
              onClick={() => onSwitch(index)}
              className={`${controlClass("stance", false, blocked)} flex flex-col gap-1.5 px-3 py-2`}
            >
              <span className="text-sm">{member.name ?? `控え${index + 1}`}</span>
              {switchLocked && !down && switchWaitSeconds > 0 ? (
                <span className={captionTextClass}>あと{switchWaitSeconds}秒</span>
              ) : null}
              <div className="flex w-full flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 shrink-0 text-[10px] text-pencil-gray">HP</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-blush-wash">
                    <div
                      className={`h-full rounded-full ${down ? "bg-faded-gray" : "bg-flush-pink"}`}
                      style={{ width: `${hpRatio * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-5 shrink-0 text-[10px] text-pencil-gray">必</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-blush-wash">
                    <div
                      className="h-full rounded-full bg-night-ink"
                      style={{ width: "0%" }}
                    />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
