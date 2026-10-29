import { DRAFT, OVERTAKE, PHYSICS } from "./config";
import type { CoursePoint, Runner } from "./types";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const speedOf = (runner: Runner) => Math.hypot(runner.vx, runner.vz);

/** スリップストリームの強さ 0〜1。前の子が近いほど強く、minGap で 1、maxGap で 0 */
export function draftAmount(runner: Runner, runners: readonly Runner[]): number {
  let best = 0;
  for (const other of runners) {
    if (other === runner || other.finishedAt !== null) continue;
    const gap = other.s - runner.s;
    if (gap < DRAFT.minGap || gap > DRAFT.maxGap || Math.abs(other.lat - runner.lat) > DRAFT.maxLateral) continue;
    best = Math.max(best, 1 - (gap - DRAFT.minGap) / (DRAFT.maxGap - DRAFT.minGap));
  }
  return best;
}

/** 相手の左右の候補から、空いている側を点数で選ぶ。どちらも使えなければ自分のレーンへ戻る */
export function chooseLine(
  runner: Runner,
  blocker: Runner,
  runners: readonly Runner[],
  points: readonly CoursePoint[],
): number {
  const maxLat = points[runner.trackIndex].w / 2 - PHYSICS.roadEdgeMargin;
  let bestLat = runner.laneBase;
  let bestScore = -Infinity;
  for (const side of [-1, 1]) {
    const lat = clamp(blocker.lat + side * OVERTAKE.lineOffset, -maxLat, maxLat);
    // 壁際で挟まれて相手のすぐ横になる候補は、抜けないので捨てる
    if (Math.abs(lat - blocker.lat) < OVERTAKE.minLineGap) continue;
    let score = -Math.abs(lat - runner.lat) * OVERTAKE.moveCost;
    for (const other of runners) {
      const isCrowded = Math.abs(other.s - runner.s) < OVERTAKE.crowdRange && Math.abs(other.lat - lat) < OVERTAKE.crowdLateral;
      if (other !== runner && other !== blocker && isCrowded) score -= OVERTAKE.crowdPenalty;
    }
    if (score > bestScore) {
      bestScore = score;
      bestLat = lat;
    }
  }
  return bestLat;
}

/** 追い抜きのラインを決める。抜き切る（clearAhead）か giveUpGap 以上離されるまで同じラインを守る */
export function planOvertakes(runners: readonly Runner[], points: readonly CoursePoint[]): void {
  for (const runner of runners) {
    if (runner.finishedAt !== null) {
      runner.passingIndex = null;
      continue;
    }
    if (runner.passingIndex !== null) {
      const gap = runners[runner.passingIndex].s - runner.s;
      if (gap < -OVERTAKE.clearAhead || gap > OVERTAKE.giveUpGap) runner.passingIndex = null;
      else continue;
    }
    let blocker: Runner | null = null;
    for (const other of runners) {
      if (other === runner) continue;
      const gap = other.s - runner.s;
      if (gap <= 0 || gap > OVERTAKE.lookAhead || Math.abs(other.lat - runner.lat) > OVERTAKE.maxLateral) continue;
      if (!blocker || gap < blocker.s - runner.s) blocker = other;
    }
    if (!blocker || speedOf(runner) < speedOf(blocker) - OVERTAKE.speedMargin) continue;
    runner.passingIndex = blocker.index;
    runner.passLat = chooseLine(runner, blocker, runners, points);
  }
}
