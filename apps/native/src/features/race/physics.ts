import { DRAFT, MINI_GAME, PHYSICS } from "./config";
import type { CoursePoint, RunnerPhysics, RunnerStats } from "./types";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** 3.1 ステータス → 物理 */
export function derivePhysics(stats: RunnerStats): RunnerPhysics {
  return {
    topSta: PHYSICS.topSpeedBase + PHYSICS.topSpeedPerStat * stats.stamina,
    topPow: PHYSICS.topSpeedBase + PHYSICS.topSpeedPerStat * stats.power,
    accel: PHYSICS.accelBase + PHYSICS.accelPerPower * stats.power,
    grip: PHYSICS.gripBase + PHYSICS.gripPerTechnique * stats.technique,
    turn: PHYSICS.turnBase + PHYSICS.turnPerTechnique * stats.technique,
    slide: PHYSICS.slideBase + PHYSICS.slidePerTechnique * stats.technique,
    mass: PHYSICS.massBase + PHYSICS.massPerPower * stats.power,
    power: stats.power,
  };
}

/** 上りで出せる速さの割合 */
export function uphillFactor(grade: number, power: number): number {
  return clamp(1 - grade * (PHYSICS.uphillSlopeBase - power * PHYSICS.uphillSlopePerPower), PHYSICS.uphillMin, 1);
}

/** ミニゲーム区間の速さの倍率（perf 0.5 で等倍） */
export function perfToSpeed(perf: number): number {
  return MINI_GAME.speedBase + MINI_GAME.speedPerPerf * perf;
}

/** 見るだけの区間でも順位が動くようにする、走者ごとの調子の波 */
export function formWave(time: number, phase: number): number {
  return 1 + PHYSICS.formSwing * Math.sin(PHYSICS.formFrequency * time + phase);
}

/** 3.2 の1: 地形・区間ごとの最高速。体力＝直線とハードル、パワー＝ダッシュ */
export function baseTopSpeed(physics: RunnerPhysics, point: CoursePoint): number {
  if (point.terrain === "straight" || point.zone === "hurdle") return physics.topSta;
  if (point.zone === "dash") return physics.topPow;
  return PHYSICS.topSpeed;
}

/** この先 curveLookahead m の曲率（絶対値）の最大 */
export function maxCurvatureAhead(points: readonly CoursePoint[], index: number): number {
  const end = Math.min(points.length - 1, index + PHYSICS.curveLookahead);
  let curvature = 0;
  for (let i = index; i <= end; i++) curvature = Math.max(curvature, Math.abs(points[i].k));
  return curvature;
}

/** 前後 gradeSpan m の高さの差から出した勾配（上りが正） */
export function gradeAt(points: readonly CoursePoint[], index: number): number {
  const ahead = points[Math.min(points.length - 1, index + PHYSICS.gradeSpan)].y;
  const behind = points[Math.max(0, index - PHYSICS.gradeSpan)].y;
  return (ahead - behind) / (PHYSICS.gradeSpan * 2);
}

export interface TargetSpeedInput {
  physics: RunnerPhysics;
  point: CoursePoint;
  /** この先の曲率の最大（maxCurvatureAhead） */
  curvature: number;
  grade: number;
  perf: number;
  time: number;
  formPhase: number;
  /** スリップストリームの強さ 0〜1 */
  draft: number;
  isStumbling: boolean;
  isBoosting: boolean;
  isFinished: boolean;
}

/** 3.2 目標速度。順番を変えると結果が変わるので、仕様の並びのまま掛ける */
export function targetSpeed(input: TargetSpeedInput): number {
  const { physics, point } = input;
  let target = baseTopSpeed(physics, point);
  if (input.curvature > PHYSICS.curveThreshold) target = Math.min(target, Math.sqrt(physics.grip / input.curvature));
  target *= input.grade > 0 ? uphillFactor(input.grade, physics.power) : 1 - input.grade * PHYSICS.downhillBonus;
  target *= point.zone ? perfToSpeed(input.perf) : formWave(input.time, input.formPhase);
  target *= 1 + DRAFT.boost * input.draft;
  if (input.isStumbling) target *= PHYSICS.stumbleFactor;
  if (input.isBoosting) target *= PHYSICS.boostFactor;
  if (input.isFinished) target = PHYSICS.finishedSpeed;
  return target;
}

/** 向いている方向の速さは目標へ加減速し、横滑りの成分は slide で減らす */
export function advanceVelocity(
  velocity: { vx: number; vz: number },
  heading: number,
  target: number,
  physics: RunnerPhysics,
  dt: number,
): { vx: number; vz: number } {
  const forwardX = Math.cos(heading);
  const forwardZ = Math.sin(heading);
  let forward = velocity.vx * forwardX + velocity.vz * forwardZ;
  const sideX = velocity.vx - forwardX * forward;
  const sideZ = velocity.vz - forwardZ * forward;
  forward =
    forward < target ? Math.min(target, forward + physics.accel * dt) : Math.max(target, forward - PHYSICS.decel * dt);
  const damping = Math.exp(-physics.slide * dt);
  return { vx: forwardX * forward + sideX * damping, vz: forwardZ * forward + sideZ * damping };
}
