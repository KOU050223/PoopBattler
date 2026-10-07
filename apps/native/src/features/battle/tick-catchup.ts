import { tickIntervalMs, type BattleSpeed } from "@poopbattler/domain/battle/battle.constants";
import { applyBattleTick } from "@poopbattler/domain/battle/battle-runtime";
import type { BattleSnapshot } from "@poopbattler/domain/battle/battle.types";

// 復帰時にまとめて進める上限。等倍で約30秒分。
// バックグラウンドに長く居ても、戻った瞬間に勝敗が確定して見えないようにする。
export const MAX_CATCHUP_TICKS = 60;

/** 経過時間から、まとめて進める tick 数を求める。不正値・負値は0、上限で打ち切る。 */
export function ticksForElapsed(
  elapsedMs: number,
  speed: BattleSpeed,
  maxTicks: number = MAX_CATCHUP_TICKS,
): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  return Math.min(maxTicks, Math.floor(elapsedMs / tickIntervalMs(speed)));
}

/** applyBattleTick を ticks 回繰り返す。勝敗が付いた時点で止める（純関数）。 */
export function foldBattleTicks(state: BattleSnapshot, ticks: number): BattleSnapshot {
  let next = state;
  for (let i = 0; i < ticks && next.status === "active"; i += 1) {
    next = applyBattleTick(next);
  }
  return next;
}

export function catchUpBattleTicks(
  state: BattleSnapshot,
  elapsedMs: number,
  speed: BattleSpeed,
  maxTicks: number = MAX_CATCHUP_TICKS,
): BattleSnapshot {
  return foldBattleTicks(state, ticksForElapsed(elapsedMs, speed, maxTicks));
}
