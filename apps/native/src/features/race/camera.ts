// レースのカメラの選択と画角補正（docs/race.md 6.1、試作 race-minigame.html の chooseShot / shotPose / updateCamera）。
// three の Camera には触らず、位置・注視点・画角の数値だけを返す。
//
// 試作との食い違いは DIFFS.md の「カメラ」の節を見る

import { range, type Rng } from "./rng";

export const CAMERA = {
  /** 抽選の重みと1カットの長さ（秒） */
  groups: {
    pack: { weight: 2.6, minSec: 2.8, maxSec: 3.4 },
    me: { weight: 5.8, minSec: 2.4, maxSec: 3.2 },
    rival: { weight: 1.6, minSec: 2.4, maxSec: 2.8 },
  },
  forcedMinSec: 1.3,
  forcedMaxSec: 1.6,
  /** 先頭がゴールのこの距離手前に来たらゴール前のカメラ */
  finishWatchAhead: 16,
  /** 自分のゴール後もこの間はゴール前のカメラ */
  finishWatchAfterSec: 2.5,
  /** 先頭がゴールのこの距離手前より先で自分を正面から撮る */
  finalSpurtAhead: 40,
  /** 次のミニゲーム区間までこの距離を切ったら後ろ追いに戻す */
  zoneLeadDistance: 8,
  /** ライバルに選ぶ前方の子の最大距離 */
  rivalMaxAhead: 25,
  startOrbitRadius: 16,
  startOrbitHeight: 8,
  /** 周回の角速度（rad/s）。試作は 1 / 2.5 */
  startOrbitSpeed: 1 / 2.5,
  /** 画角の補正 */
  designAspect: 4 / 3.4,
  maxFovDeg: 80,
  /** 追いかけの補間の係数（大きいほど速い）。試作の follow が省略されたときの値 */
  defaultFollow: 5,
  /** 画角の追従速度と、抜いた時に狭める量が戻る速さ */
  fovFollow: 6,
  fovKickDecay: 4,
  overtakeFovKickDeg: -10,
  dashFovWidenDeg: 10,
} as const;

export type CameraKind =
  | "start"
  | "finish"
  | "chase"
  | "hurdle"
  | "minigame"
  | "finishFront"
  | "packRear"
  | "packFront"
  | "meSide"
  | "meFront"
  | "meHigh"
  | "close"
  | "rival";

export type CameraTrigger = "overtake" | "bump" | "cutin" | null;

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface CameraRunner extends Vec3 {
  /** 向き（rad） */
  h: number;
  /** コース上の距離 */
  s: number;
  /** 中心線からの横位置（左が負） */
  lat: number;
  isFinished: boolean;
}

/** 中心線の点。距離 s はコースの範囲に丸めて引く（呼び出し側の責任） */
export interface CameraPoint extends Vec3 {
  h: number;
}

export interface CameraInput {
  isPreStart: boolean;
  /** シミュレーション時間（秒）。ゴール後2.5秒の判定に使う */
  time: number;
  finishS: number;
  /** 先頭の距離 */
  leaderS: number;
  /** 自分のゴール時刻。未ゴールは null */
  playerFinishedAt: number | null;
  isHurdleSlow: boolean;
  isInMiniGame: boolean;
  /** 次のミニゲーム区間の入口までの距離。残りがなければ null */
  distanceToNextZone: number | null;
  /** このフレームで起きた強制切り替えのきっかけ */
  trigger: CameraTrigger;
  runners: readonly CameraRunner[];
  playerIndex: number;
  pointAt: (s: number) => CameraPoint;
  /** 画面の縦横比（幅/高さ） */
  aspect: number;
  /** ダッシュ中の出来（0〜1）。ダッシュ以外は 0 */
  dashPerf: number;
}

export interface CameraOutput {
  kind: CameraKind;
  position: Vec3;
  target: Vec3;
  fovDeg: number;
  /** 種類が変わったフレーム。補間せず切り替えた */
  isCut: boolean;
  /** kind が rival のとき、その子の番号 */
  rivalIndex: number | null;
}

interface Pose {
  position: Vec3;
  target: Vec3;
  fovDeg: number;
  /** 0 は補間せず固定 */
  follow: number;
}

type Group = keyof typeof CAMERA.groups;

const GROUP_SHOTS: Record<Group, readonly CameraKind[]> = {
  pack: ["packRear", "packFront"],
  me: ["chase", "meSide", "meFront", "meHigh", "close"],
  rival: ["rival"],
};

const TRIGGER_KIND: Record<Exclude<CameraTrigger, null>, CameraKind> = {
  overtake: "close",
  bump: "meSide",
  cutin: "close",
};

const lerp = (from: number, to: number, ratio: number): number => from + (to - from) * ratio;
const lerpVec = (from: Vec3, to: Vec3, ratio: number): Vec3 => ({
  x: lerp(from.x, to.x, ratio),
  y: lerp(from.y, to.y, ratio),
  z: lerp(from.z, to.z, ratio),
});

/** 各カメラの画角は横長（4:3.4）で決めてある。縦長では横に見える範囲が同じになるよう縦の画角を計算し直す */
export function fitFov(baseFovDeg: number, aspect: number): number {
  if (aspect >= CAMERA.designAspect) return baseFovDeg;
  const horizontal = 2 * Math.atan(Math.tan((baseFovDeg * Math.PI) / 360) * CAMERA.designAspect);
  const fitted = (2 * Math.atan(Math.tan(horizontal / 2) / aspect) * 180) / Math.PI;
  return Math.min(CAMERA.maxFovDeg, fitted);
}

export interface CameraDirector {
  update(input: CameraInput, dt: number): CameraOutput;
}

export function createCameraDirector(rng: Rng): CameraDirector {
  let clock = 0;
  let kind: CameraKind | null = null;
  let position: Vec3 = { x: 0, y: 0, z: 0 };
  let target: Vec3 = { x: 0, y: 0, z: 0 };
  let fovDeg = 0;
  let fovKick = 0;
  let forcedKind: CameraKind | null = null;
  let forcedUntil = 0;
  let cycleKind: CameraKind = "chase";
  let cycleUntil = 0;
  let lastGroup: Group = "me";
  const groupIndex: Record<Group, number> = { pack: 0, me: 0, rival: 0 };
  let rivalIndex: number | null = null;

  function pickGroup(): Group {
    // 全体とライバルは2回続けない
    const groups = (Object.keys(CAMERA.groups) as Group[]).filter((g) => g === "me" || g !== lastGroup);
    let roll = rng() * groups.reduce((sum, g) => sum + CAMERA.groups[g].weight, 0);
    for (const group of groups) {
      roll -= CAMERA.groups[group].weight;
      if (roll < 0) return group;
    }
    return "me";
  }

  function pickRival(input: CameraInput): number | null {
    const me = input.runners[input.playerIndex];
    const others = input.runners.map((runner, index) => ({ runner, index })).filter((o) => o.index !== input.playerIndex && !o.runner.isFinished);
    const ahead = others.filter((o) => o.runner.s > me.s).sort((a, b) => a.runner.s - b.runner.s)[0];
    const behind = others.filter((o) => o.runner.s <= me.s).sort((a, b) => b.runner.s - a.runner.s)[0];
    const chosen = ahead && ahead.runner.s - me.s < CAMERA.rivalMaxAhead ? ahead : (behind ?? ahead);
    return chosen ? chosen.index : null;
  }

  function nextCycle(input: CameraInput): void {
    let group = pickGroup();
    if (group === "rival") {
      rivalIndex = pickRival(input);
      if (rivalIndex === null) group = "me";
    }
    const shots = GROUP_SHOTS[group];
    cycleKind = shots[groupIndex[group] % shots.length];
    groupIndex[group] += 1;
    lastGroup = group;
    cycleUntil = clock + range(rng, CAMERA.groups[group].minSec, CAMERA.groups[group].maxSec);
  }

  function chooseKind(input: CameraInput): CameraKind {
    if (input.isPreStart) return "start";
    const isPlayerDone = input.playerFinishedAt !== null;
    if (input.leaderS > input.finishS - CAMERA.finishWatchAhead && (!isPlayerDone || input.time - input.playerFinishedAt! < CAMERA.finishWatchAfterSec)) return "finish";
    if (isPlayerDone) return "chase";
    if (input.isHurdleSlow) return "hurdle";
    if (forcedKind && clock < forcedUntil) return forcedKind;
    if (input.isInMiniGame) return "minigame";
    if (input.distanceToNextZone !== null && input.distanceToNextZone < CAMERA.zoneLeadDistance) return "minigame";
    if (input.leaderS > input.finishS - CAMERA.finalSpurtAhead) return "finishFront";
    if (clock > cycleUntil) nextCycle(input);
    return cycleKind;
  }

  function poseFor(shot: CameraKind, input: CameraInput): Pose {
    const me = input.runners[input.playerIndex];
    const pm = input.pointAt(me.s);
    const fx = Math.cos(pm.h);
    const fz = Math.sin(pm.h);
    const nx = -Math.sin(pm.h);
    const nz = Math.cos(pm.h);
    const at = (x: number, y: number, z: number): Vec3 => ({ x, y, z });
    switch (shot) {
      case "start": {
        const center = packCenter(input.runners);
        const angle = clock * CAMERA.startOrbitSpeed;
        return {
          position: at(center.x + Math.cos(angle) * CAMERA.startOrbitRadius, CAMERA.startOrbitHeight, center.z + Math.sin(angle) * CAMERA.startOrbitRadius),
          target: at(center.x, 0.8, center.z),
          fovDeg: 48,
          follow: CAMERA.defaultFollow,
        };
      }
      case "finishFront":
        return { position: at(me.x + fx * 10 + nx * 2, me.y + 1.0, me.z + fz * 10 + nz * 2), target: at(me.x, me.y + 1.1, me.z), fovDeg: 42, follow: 10 };
      case "close":
        return { position: at(me.x + nx * 3.2 + fx * 2.4, me.y + 0.55, me.z + nz * 3.2 + fz * 2.4), target: at(me.x + fx * 0.8, me.y + 1.1, me.z + fz * 0.8), fovDeg: 50, follow: 14 };
      case "packRear":
      case "packFront":
        return packPose(shot, input);
      case "meSide":
        return { position: at(me.x + nx * 6 + fx * 0.5, me.y + 1.6, me.z + nz * 6 + fz * 0.5), target: at(me.x + fx * 0.5, me.y + 1, me.z + fz * 0.5), fovDeg: 40, follow: 10 };
      case "meFront":
        return { position: at(me.x + fx * 8 + nx * 1.5, me.y + 1.2, me.z + fz * 8 + nz * 1.5), target: at(me.x, me.y + 1.1, me.z), fovDeg: 44, follow: 10 };
      case "meHigh":
        return { position: at(me.x - fx * 4 - nx * 2.5, me.y + 5, me.z - fz * 4 - nz * 2.5), target: at(me.x + fx * 10, me.y, me.z + fz * 10), fovDeg: 55, follow: 7 };
      case "rival": {
        const rival = input.runners[rivalIndex ?? input.playerIndex];
        const pr = input.pointAt(rival.s);
        const rfx = Math.cos(pr.h);
        const rfz = Math.sin(pr.h);
        // 道の外側から撮る
        const side = rival.lat > 0 ? 1 : -1;
        return { position: at(rival.x - rfz * side * 5 + rfx * 1.5, rival.y + 1.3, rival.z + rfx * side * 5 + rfz * 1.5), target: at(rival.x, rival.y + 1, rival.z), fovDeg: 42, follow: 10 };
      }
      case "minigame":
        return { position: at(me.x - fx * 6.5, me.y + 3.8, me.z - fz * 6.5), target: at(me.x + fx * 9, me.y + 0.2, me.z + fz * 9), fovDeg: 62, follow: 6 };
      case "hurdle":
        return { position: at(me.x + nx * 4.5 + fx * 1.5, me.y + 0.7, me.z + nz * 4.5 + fz * 1.5), target: at(me.x + fx * 2.5, me.y + 0.9, me.z + fz * 2.5), fovDeg: 46, follow: 12 };
      case "finish": {
        const pf = input.pointAt(input.finishS);
        const gx = Math.cos(pf.h);
        const gz = Math.sin(pf.h);
        return { position: at(pf.x - gz * 9 + gx * 1.5, pf.y + 1.5, pf.z + gx * 9 + gz * 1.5), target: at(pf.x - gx * 3, pf.y + 0.9, pf.z - gz * 3), fovDeg: 44, follow: 0 };
      }
      case "chase":
        return { position: at(me.x - fx * 7, me.y + 3.4, me.z - fz * 7), target: at(me.x + fx * 7, me.y + 1, me.z + fz * 7), fovDeg: 62, follow: 5 };
    }
  }

  return {
    update(input, dt) {
      clock += dt;
      if (input.trigger) {
        forcedKind = TRIGGER_KIND[input.trigger];
        forcedUntil = clock + range(rng, CAMERA.forcedMinSec, CAMERA.forcedMaxSec);
        if (input.trigger === "overtake") fovKick = CAMERA.overtakeFovKickDeg;
      }
      const shot = chooseKind(input);
      const pose = poseFor(shot, input);
      const isCut = shot !== kind;
      if (isCut) {
        kind = shot;
        position = pose.position;
        target = pose.target;
        fovDeg = fitFov(pose.fovDeg, input.aspect);
      } else if (pose.follow === 0) {
        position = pose.position;
        target = pose.target;
      } else {
        const ratio = 1 - Math.exp(-dt * pose.follow);
        position = lerpVec(position, pose.position, ratio);
        target = lerpVec(target, pose.target, ratio);
      }
      fovKick *= Math.exp(-dt * CAMERA.fovKickDecay);
      // 連打が速いほど画角を広げて速度感を出す
      const dashWiden = input.dashPerf * CAMERA.dashFovWidenDeg;
      const goalFov = fitFov(pose.fovDeg + fovKick + dashWiden, input.aspect);
      fovDeg += (goalFov - fovDeg) * Math.min(1, dt * CAMERA.fovFollow);
      return { kind: shot, position, target, fovDeg, isCut, rivalIndex: shot === "rival" ? rivalIndex : null };
    },
  };
}

function packCenter(runners: readonly CameraRunner[]): Vec3 {
  const sum = runners.reduce((acc, r) => ({ x: acc.x + r.x, y: acc.y + r.y, z: acc.z + r.z }), { x: 0, y: 0, z: 0 });
  return { x: sum.x / runners.length, y: sum.y / runners.length, z: sum.z / runners.length };
}

/** 群れの前後の長さに合わせて引く。全員が画面に入るように */
function packPose(shot: "packRear" | "packFront", input: CameraInput): Pose {
  const active = input.runners.filter((r) => !r.isFinished);
  const list = active.length > 0 ? active : input.runners;
  const minS = Math.min(...list.map((r) => r.s));
  const maxS = Math.max(...list.map((r) => r.s));
  const spread = maxS - minS;
  const mid = input.pointAt((minS + maxS) / 2);
  const mfx = Math.cos(mid.h);
  const mfz = Math.sin(mid.h);
  if (shot === "packRear") {
    const back = input.pointAt(minS);
    const distance = 7 + spread * 0.35;
    return {
      position: { x: back.x - mfx * distance, y: back.y + 6 + spread * 0.4, z: back.z - mfz * distance },
      target: { x: mid.x + mfx * spread * 0.15, y: mid.y, z: mid.z + mfz * spread * 0.15 },
      fovDeg: 50,
      follow: 4,
    };
  }
  const front = input.pointAt(maxS + 8 + spread * 0.25);
  return {
    position: { x: front.x - Math.sin(front.h) * 4, y: front.y + 5 + spread * 0.35, z: front.z + Math.cos(front.h) * 4 },
    target: { x: mid.x, y: mid.y + 0.5, z: mid.z },
    fovDeg: 50,
    follow: 4,
  };
}
