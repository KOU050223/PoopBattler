// 走者1体が再生するクリップの選択。Runner の状態から決めるだけの純関数（runner-pose.ts と同じ立場）。
import type { Poopm3DBattleMotion } from "../../poopm-3d/poopm-3d-motion";
import { PHYSICS } from "../config";
import type { Race, Runner } from "../types";

export type RunnerMotion = Extract<Poopm3DBattleMotion, "idle" | "run" | "hit" | "win" | "lose">;

export const RUNNER_MOTION = {
  /** 走り出す速さ（topSpeed 比）。止まる側より高くして、境目でクリップが行き来しないようにする */
  startSpeedRatio: 0.08,
  stopSpeedRatio: 0.03,
  /** run クリップの再生速度。速さに比例させ、遅いときも足が止まって見えない下限を置く */
  cadenceMin: 0.5,
  cadenceMax: 1.5,
  /** ジャンプ中は足を止めず、ゆっくり回す（空中で足だけ高速に動くと不自然） */
  jumpCadence: 0.35,
} as const;

/** ゴールした順位（1始まり）。まだなら null。同時着は番号の若い方を先にする */
export function finishPlace(race: Race, runner: Runner): number | null {
  if (runner.finishedAt === null) return null;
  let place = 1;
  for (const other of race.runners) {
    if (other.finishedAt === null || other === runner) continue;
    if (other.finishedAt < runner.finishedAt || (other.finishedAt === runner.finishedAt && other.index < runner.index)) place += 1;
  }
  return place;
}

/**
 * 今のクリップ。優先順位は ゴール > 転倒 > 走り／待機。
 * reduce motion では体が大きく動く hit / win / lose を使わず、走りと待機だけにする。
 */
export function pickRunnerMotion(race: Race, runner: Runner, current: RunnerMotion, isReducedMotion: boolean): RunnerMotion {
  if (!isReducedMotion) {
    const place = finishPlace(race, runner);
    if (place !== null) return place === 1 ? "win" : "lose";
    if (runner.stumbleUntil > race.time) return "hit";
  }
  const speedRatio = Math.hypot(runner.vx, runner.vz) / PHYSICS.topSpeed;
  const threshold = current === "run" ? RUNNER_MOTION.stopSpeedRatio : RUNNER_MOTION.startSpeedRatio;
  return speedRatio > threshold ? "run" : "idle";
}

/** run クリップの再生速度（timeScale）。1.0 でクリップ本来の速さ */
export function runnerCadence(race: Race, runner: Runner): number {
  if (runner.jumpUntil > race.time) return RUNNER_MOTION.jumpCadence;
  const speedRatio = Math.hypot(runner.vx, runner.vz) / PHYSICS.topSpeed;
  return Math.min(RUNNER_MOTION.cadenceMax, Math.max(RUNNER_MOTION.cadenceMin, RUNNER_MOTION.cadenceMin + speedRatio));
}
