// 走者1体の見た目の姿勢。Runner の状態から決めるだけの純関数（描画側はロジックを進めない）。
// 毎フレーム呼ぶので、結果は渡された出力オブジェクトに書き込む（新しいオブジェクトを作らない）。
import { HURDLE, PHYSICS } from "../config";
import type { Runner } from "../types";

export interface RunnerPose {
  x: number;
  /** 足元の高さ（路面＋走る揺れ＋ジャンプ） */
  y: number;
  z: number;
  /** three の rotation.y */
  rotationY: number;
  /** 前のめり（転倒）。three の rotation.x。正で前に倒れる */
  pitch: number;
  /** 横の傾き（つり橋）。three の rotation.z */
  roll: number;
  /** 路面からの浮き（ジャンプ）。影を小さくするのに使う */
  lift: number;
}

export const RUNNER_VISUAL = {
  /** 走る揺れ。試作は 90ms ごとの絶対値 sin（角周波数 1000/90） */
  bobFrequency: 1000 / 90,
  bobHeight: 0.12,
  bobSpeedRef: PHYSICS.topSpeed,
  /** 転倒で前に倒れる最大の角度（rad） */
  stumblePitch: 1.1,
  /** つり橋で針が端に寄ったときの傾き（試作の 0.35） */
  bridgeRollPerNeedle: 0.35,
} as const;

export function createRunnerPose(): RunnerPose {
  return { x: 0, y: 0, z: 0, rotationY: 0, pitch: 0, roll: 0, lift: 0 };
}

/** モデルは +z を向いている前提。向き h（+x が 0、+z 側へ増える）に合わせて回す */
export function headingToRotationY(heading: number): number {
  return Math.PI / 2 - heading;
}

export function poseRunner(runner: Runner, raceTime: number, isReducedMotion: boolean, out: RunnerPose): RunnerPose {
  const speedRatio = Math.min(1, Math.hypot(runner.vx, runner.vz) / RUNNER_VISUAL.bobSpeedRef);
  const bob = isReducedMotion ? 0 : Math.abs(Math.sin(raceTime * RUNNER_VISUAL.bobFrequency + runner.laneBase)) * RUNNER_VISUAL.bobHeight * speedRatio;

  const jumpLeft = runner.jumpUntil - raceTime;
  const jumpProgress = 1 - jumpLeft / HURDLE.jumpSec;
  const lift = jumpLeft > 0 && jumpProgress >= 0 ? Math.sin(Math.PI * jumpProgress) * HURDLE.jumpHeight : 0;

  const stumbleLeft = runner.stumbleUntil - raceTime;
  const stumbleProgress = 1 - stumbleLeft / PHYSICS.stumbleDuration;
  const pitch = stumbleLeft > 0 && stumbleProgress >= 0 ? Math.sin(Math.PI * stumbleProgress) * RUNNER_VISUAL.stumblePitch : 0;

  out.x = runner.x;
  out.y = runner.y + bob + lift;
  out.z = runner.z;
  out.rotationY = headingToRotationY(runner.h);
  out.pitch = pitch;
  out.roll = runner.bridgeNeedle === null ? 0 : -runner.bridgeNeedle * RUNNER_VISUAL.bridgeRollPerNeedle;
  out.lift = lift;
  return out;
}
