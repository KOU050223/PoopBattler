// ダッシュ（連打）。直近の連打の速さから目標を決め、perf を寄せていく（race.md 5.2）
import { DASH, MINI_GAME } from "../config";
import { STEP_SEC } from "../clock";
import { clamp, PLAYER_INDEX, type MinigameOutput } from "./shared";

export interface DashState {
  kind: "dash";
  perf: number;
  /** 直近の連打の時刻（実時間 ms）。スローの影響を受けないよう実時間で持つ */
  tapsMs: number[];
  target: number;
  sumPerf: number;
  sumSec: number;
  isAllOut: boolean;
}

export const beginDash = (): DashState => ({
  kind: "dash",
  perf: MINI_GAME.perfStartDash,
  tapsMs: [],
  target: 0,
  sumPerf: 0,
  sumSec: 0,
  isAllOut: false,
});

/** 窓の中の連打の速さ(回/秒)から目標の出来を出す。毎秒9回で1、2回以下で0 */
export function dashTarget(tapsMs: readonly number[], nowMs: number): number {
  const windowMs = DASH.windowSec * 1000;
  const recentCount = tapsMs.filter((atMs) => nowMs - atMs < windowMs).length;
  return clamp((recentCount / DASH.windowSec - DASH.minRate) / DASH.rateRange, 0, 1);
}

export function tapDash(state: DashState, atMs: number, out: MinigameOutput): void {
  state.tapsMs.push(atMs);
  out.events.push({ type: "dashTap" });
}

/** 1ステップぶん。nowMs は連打と同じ時計の実時間 */
export function updateDash(state: DashState, nowMs: number, out: MinigameOutput): void {
  const windowMs = DASH.windowSec * 1000;
  state.tapsMs = state.tapsMs.filter((atMs) => nowMs - atMs < windowMs);
  state.target = dashTarget(state.tapsMs, nowMs);
  state.perf += (state.target - state.perf) * Math.min(1, STEP_SEC * DASH.followSpeed);
  state.sumPerf += state.perf * STEP_SEC;
  state.sumSec += STEP_SEC;
  out.commands.push({ type: "setPerf", runner: PLAYER_INDEX, perf: state.perf });

  const isAllOut = state.perf > DASH.allOutPerf;
  if (isAllOut && !state.isAllOut) out.events.push({ type: "dashAllOut" });
  state.isAllOut = isAllOut;
}

/** 区間全体の時間平均。0除算を避ける下限は試作に合わせる */
export const dashAverage = (state: DashState) => state.sumPerf / Math.max(0.01, state.sumSec);
