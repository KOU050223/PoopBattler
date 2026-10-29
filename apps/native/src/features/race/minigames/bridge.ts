// つり橋（左右の長押し）。針がゆれるのを押し返して中央に保つ（race.md 5.2）
import { BRIDGE } from "../config";
import { STEP_SEC } from "../clock";
import { range, type Rng } from "../rng";
import type { HoldDir } from "../ui/input";
import { clamp, PLAYER_INDEX, type MinigameOutput } from "./shared";

/** 針の初期位置の範囲と、ゆれの位相の範囲（試作どおり） */
const INITIAL_NEEDLE_RANGE = 0.2;
const PHASE_RANGE = 6;

export interface BridgeState {
  kind: "bridge";
  perf: number;
  /** 区間に入ってからの時間（ゆれが大きくなっていく） */
  elapsedSec: number;
  /** 針の位置（-1〜1） */
  needle: number;
  needleVelocity: number;
  phases: [number, number];
  holdDir: HoldDir;
  sumPerf: number;
  sumSec: number;
}

export function beginBridge(rng: Rng, startPerf: number): BridgeState {
  const needle = range(rng, -INITIAL_NEEDLE_RANGE, INITIAL_NEEDLE_RANGE);
  return {
    kind: "bridge",
    perf: startPerf,
    elapsedSec: 0,
    needle,
    needleVelocity: 0,
    phases: [range(rng, 0, PHASE_RANGE), range(rng, 0, PHASE_RANGE)],
    holdDir: 0,
    sumPerf: 0,
    sumSec: 0,
  };
}

export function bridgeDrift(elapsedSec: number, phases: readonly [number, number]): number {
  const { driftSlow, driftFast, driftBase, driftGrowth } = BRIDGE;
  const wave = Math.sin(elapsedSec * driftSlow.freq + phases[0]) * driftSlow.amp + Math.sin(elapsedSec * driftFast.freq + phases[1]) * driftFast.amp;
  return wave * (driftBase + elapsedSec * driftGrowth);
}

/** 中央 ±safeHalfWidth で1、そこから端へ直線的に0 */
export function bridgeScore(needle: number): number {
  const offset = Math.abs(needle);
  if (offset < BRIDGE.safeHalfWidth) return 1;
  return clamp(1 - (offset - BRIDGE.safeHalfWidth) / (1 - BRIDGE.safeHalfWidth), 0, 1);
}

export function updateBridge(state: BridgeState, out: MinigameOutput): void {
  state.elapsedSec += STEP_SEC;
  const drift = bridgeDrift(state.elapsedSec, state.phases);
  state.needleVelocity += (drift + state.holdDir * BRIDGE.holdAccel - state.needleVelocity * BRIDGE.damping) * STEP_SEC;
  state.needle += state.needleVelocity * STEP_SEC;
  // 端に着いたら止める（跳ね返らない）
  if (Math.abs(state.needle) >= 1) {
    state.needle = Math.sign(state.needle);
    state.needleVelocity = 0;
  }
  state.perf = bridgeScore(state.needle);
  state.sumPerf += state.perf * STEP_SEC;
  state.sumSec += STEP_SEC;
  out.commands.push({ type: "setPerf", runner: PLAYER_INDEX, perf: state.perf });
  out.commands.push({ type: "setBridgeNeedle", runner: PLAYER_INDEX, needle: state.needle });
}

export const bridgeAverage = (state: BridgeState) => state.sumPerf / Math.max(0.01, state.sumSec);
