// 触覚を鳴らす出来事の選び方と間引き。expo-haptics には触れない純関数（鳴らすのは use-race-haptics.ts）
import type { MinigameEvent, RaceEvent } from "../types";

const PLAYER_INDEX = 0;

/** 同じ種類の触覚の最短間隔。連打（1秒に9回ほど）を1回ごとに鳴らさないための値 */
export const HAPTIC_MIN_INTERVAL_MS = 120;

export type HapticKind = "bump" | "perfect" | "stumble" | "sRank" | "dashTap";

/** ゴツン・パーフェクト・ドテッ・Sランク（race.md 7章の11）と、連打の手応え */
export function hapticKindsOf(raceEvents: readonly RaceEvent[], minigameEvents: readonly MinigameEvent[]): HapticKind[] {
  const kinds: HapticKind[] = [];
  for (const event of raceEvents) {
    if (event.type === "bump" && event.runners.includes(PLAYER_INDEX)) kinds.push("bump");
    if (event.type === "stumble" && event.runner === PLAYER_INDEX) kinds.push("stumble");
  }
  for (const event of minigameEvents) {
    if (event.type === "hurdleResult" && event.judge === "perfect") kinds.push("perfect");
    if (event.type === "end" && event.grade === "S") kinds.push("sRank");
    if (event.type === "dashTap") kinds.push("dashTap");
  }
  return kinds;
}

export interface HapticGate {
  /** 鳴らしてよければ true を返し、鳴らした時刻を覚える */
  tryFire(kind: HapticKind, nowMs: number): boolean;
}

/** 種類ごとに間引く。連打の振動が、同じ瞬間のゴツン！を押しのけないようにするため */
export function createHapticGate(minIntervalMs: number = HAPTIC_MIN_INTERVAL_MS): HapticGate {
  const lastFiredMs = new Map<HapticKind, number>();
  return {
    tryFire(kind, nowMs) {
      const last = lastFiredMs.get(kind);
      if (last !== undefined && nowMs - last < minIntervalMs) return false;
      lastFiredMs.set(kind, nowMs);
      return true;
    },
  };
}
