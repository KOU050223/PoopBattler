import type { Fighter, Game, Side } from "../types";
import type { Vec3 } from "./camera";
import { GAP, GLOW, K, TOILET_X, TOP } from "./constants";

/** 腕は [左(-1), 右(+1)] の順。試作の arms と同じ */
export type ArmPair = readonly [number, number];

/** 平滑化の持ち越し状態。力士ごとに1つ持ち、poseFighter が新しい値を返す */
export interface PoseSmoothing {
  fx: number;
  lz: number;
  sq: number;
  armY: number;
  armX: number;
  z: number;
  /** 腕ごとの振りかぶり（pivot.rotation.z） */
  raise: ArmPair;
  /** 腕ごとの振り（pivot.rotation.y の元） */
  swing: ArmPair;
}

export const INITIAL_POSE_SMOOTHING: PoseSmoothing = {
  fx: 0,
  lz: 0,
  sq: 1,
  armY: 0.9,
  armX: 0.26,
  z: 0,
  raise: [0, 0],
  swing: [0.9, 0.9],
};

/** 状態から決まる目標値。平滑化の前 */
export interface PoseTarget {
  /** 攻める向きへの前進(ワールド単位) */
  fx: number;
  /** 傾き。正で後ろへ反る */
  lz: number;
  /** 潰れ。1 が通常、小さいほど縦に潰れる */
  sq: number;
  /** 腕の高さ */
  armY: number;
  /** 腕の前後 */
  armX: number;
  /** 土俵の軸に直交する横ずれ */
  z: number;
  glowColor: number;
  /** 0〜1。emissiveIntensity には GLOW_INTENSITY_SCALE を掛けて使う */
  glow: number;
  raise: ArmPair;
  swing: ArmPair;
}

export interface ArmPose {
  pivotRotationY: number;
  pivotRotationZ: number;
  meshX: number;
}

export interface RikishiPose {
  /** 平滑化後の値 */
  fx: number;
  lz: number;
  sq: number;
  armY: number;
  armX: number;
  z: number;
  /** root.position */
  position: Vec3;
  /** root.rotation.y */
  rotationY: number;
  /** lean.rotation.z */
  leanRotationZ: number;
  /** lean.scale。体積を保つため横を 1/√sq にする */
  leanScale: Vec3;
  arms: readonly [ArmPose, ArmPose];
  glowColor: number;
  /** emissiveIntensity にそのまま使える値 */
  glowIntensity: number;
}

export const GLOW_INTENSITY_SCALE = 0.7;

const ARM_SIDES = [-1, 1] as const;
const DEG_TO_RAD = Math.PI / 180;

const lerp = (from: number, to: number, ratio: number): number => from + (to - from) * ratio;
const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

/** 土俵の軸方向 along と横ずれ lateral を、yaw で軸ごと回してワールド座標にする */
export function toWorld(along: number, lateral: number, yaw: number): Vec3 {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  return { x: along * cos + lateral * sin, y: TOP, z: -along * sin + lateral * cos };
}

/** ロジック座標 pos のとき、side の力士の軸上の位置。forward は攻める向きへの前進量 */
export function alongAxis(pos: number, side: Side, direction: 1 | -1, forward: number): number {
  return pos * K + (side === 0 ? -GAP : GAP) + direction * forward;
}

/** 前進も横ずれもない立ち位置。FX の発生位置などに使う */
export function restingPosition(pos: number, side: Side, yaw: number): Vec3 {
  return toWorld(alongAxis(pos, side, side === 0 ? 1 : -1, 0), 0, yaw);
}

type MutableTarget = Pick<PoseTarget, "fx" | "lz" | "sq" | "armY" | "armX" | "z" | "glowColor" | "glow">;

/**
 * 状態ごとの目標。描画のない純関数なので、状態別のポーズはここで検証する。
 * isPreFight は立ち合い前・メニュー（息をするだけの静かな構え）
 */
export function poseTarget(fighter: Fighter, game: Game, nowMs: number, isPreFight = false): PoseTarget {
  const progress = fighter.dur ? Math.min(1, fighter.t / fighter.dur) : 0;
  const target: MutableTarget = { fx: 0, lz: 0, sq: 1, armY: 0.9, armX: 0.26, z: 0, glowColor: GLOW.none, glow: 0 };

  if (isPreFight) {
    target.sq = 1 + Math.sin(nowMs * 0.004 + fighter.side) * 0.02;
    target.lz = -0.12;
    target.armY = 1.1;
  } else {
    applyState(target, fighter, progress, nowMs);
  }

  if (fighter.hot > 0 && target.glow < 0.6 && game.phase === "fight" && !isPreFight) {
    target.glowColor = GLOW.hot;
    target.glow = 0.55 + 0.35 * Math.sin(nowMs * 0.025);
  }

  return { ...target, ...armTargets(fighter, target.armY, progress, !isPreFight) };
}

function applyState(target: MutableTarget, fighter: Fighter, progress: number, nowMs: number): void {
  const { move } = fighter;
  switch (fighter.state) {
    case "idle":
      target.sq = 1 + Math.sin(nowMs * 0.006 + fighter.side * 2) * 0.025;
      target.armY = 0.95;
      break;
    case "windup":
      if (move === "tsuki") {
        Object.assign(target, { fx: -0.25 * progress, lz: 0.18 * progress, armY: 0.25, armX: 0.05, glow: 0.5 + 0.5 * progress, glowColor: GLOW.tsuki });
      } else {
        Object.assign(target, { fx: -0.15, lz: -0.1, sq: 1 - 0.12 * fighter.charge, armY: 1.55, glow: 0.35 + 0.65 * fighter.charge, glowColor: GLOW.grab });
      }
      if (fighter.special) target.glowColor = GLOW.special;
      break;
    case "active":
      if (move === "tsuki") Object.assign(target, { fx: 0.55, lz: -0.35, armY: 0.05, armX: 0.62 });
      else Object.assign(target, { fx: 0.6, lz: -0.28, armY: 0.35, armX: 0.4, sq: 0.92 });
      break;
    case "recover":
      Object.assign(target, { fx: 0.1, lz: -0.1, armY: 0.7 });
      break;
    case "dodge": {
      const isActive = fighter.t < fighter.dodgeAct;
      // 除算の 0 割りを避けるため最低 1ms
      const recoverProgress = clamp01((fighter.t - fighter.dodgeAct) / Math.max(1, fighter.dur - fighter.dodgeAct));
      target.z = fighter.dodgeDir * (isActive ? 0.75 : lerp(0.75, 0, recoverProgress));
      target.lz = 0.12;
      target.armY = 1.2;
      if (isActive) Object.assign(target, { glow: 0.5, glowColor: GLOW.dodge });
      break;
    }
    case "parry":
      Object.assign(target, { lz: 0.22, fx: -0.1, armY: 0.35, armX: 0.12, sq: 0.94 });
      if (fighter.t < fighter.parryAct) Object.assign(target, { glow: 0.85, glowColor: GLOW.parry });
      break;
    case "lunge":
      Object.assign(target, { fx: 0.3, lz: -0.25, armY: 1.0, armX: 0.35, glow: 1, glowColor: fighter.special ? GLOW.special : GLOW.grab });
      break;
    case "inashi":
      if (fighter.t < fighter.parryAct) {
        Object.assign(target, { lz: 0.22, fx: -0.1, armY: 0.35, armX: 0.12, sq: 0.94, glow: 0.85, glowColor: GLOW.parry });
      } else {
        const slide = fighter.idir === 0 ? 0.55 : fighter.idir === 6 ? -0.55 : 0;
        Object.assign(target, { z: slide, lz: 0.12, fx: -0.08, sq: 0.93, armY: 1.15, armX: 0.18, glow: 0.35, glowColor: GLOW.dodge });
      }
      break;
    case "stance":
      Object.assign(target, { lz: 0.2, armY: 1.35, glow: 0.6 + 0.3 * Math.sin(nowMs * 0.02), glowColor: GLOW.special, z: Math.sin(nowMs * 0.012) * 0.25 });
      break;
    case "stagger":
      Object.assign(target, { lz: 0.4 * Math.sin(fighter.t * 0.03) * (1 - progress) + 0.15, fx: -0.2, armY: 1.5 });
      break;
    case "clinch":
      Object.assign(target, { fx: 0.35 + Math.sin(nowMs * 0.05 + fighter.side) * 0.05, lz: -0.3, armY: 0.25, armX: 0.38, sq: 0.95 });
      break;
  }
}

/** 突きの構え・発動、パリィで、突く方向側の腕だけを振りかぶる */
function armTargets(fighter: Fighter, defaultArmY: number, progress: number, isArmed: boolean): { raise: ArmPair; swing: ArmPair } {
  let directionIndex = -1;
  let phase: "windup" | "active" | "parry" = "windup";
  if (isArmed) {
    if (fighter.move === "tsuki" && (fighter.state === "windup" || fighter.state === "active")) {
      directionIndex = fighter.dir7;
      phase = fighter.state;
    } else if (fighter.state === "inashi" && fighter.t < fighter.parryAct) {
      directionIndex = fighter.idir;
      phase = "parry";
    }
  }

  const raise: [number, number] = [0, 0];
  const swing: [number, number] = [defaultArmY, defaultArmY];
  if (directionIndex < 0) return { raise, swing };

  const angle = directionIndex * 30 * DEG_TO_RAD;
  const screenSide = directionIndex < 3 ? 1 : directionIndex > 3 ? -1 : 0;
  // 西は向きが逆なので鏡にする
  const localSide = fighter.side === 0 ? screenSide : -screenSide;
  ARM_SIDES.forEach((armSide, index) => {
    if (screenSide !== 0 && armSide !== localSide) return;
    if (phase === "windup") {
      raise[index] = Math.sin(angle) * 1.3 * Math.min(1, progress * 1.6);
      swing[index] = 0.3 + Math.abs(Math.cos(angle)) * 1.3;
    } else if (phase === "active") {
      raise[index] = 0.25;
      swing[index] = 0.05;
    } else {
      raise[index] = Math.sin(angle) * 1.1;
      swing[index] = 0.2 + Math.abs(Math.cos(angle)) * 0.9;
    }
  });
  return { raise, swing };
}

export interface PoseInput {
  fighter: Fighter;
  game: Game;
  nowMs: number;
  /** ロジック時間(スローモー・序盤モード適用後) */
  dtMs: number;
  yaw: number;
  smoothing: PoseSmoothing;
  /** 立ち合い前の「見合って」の間・メニュー */
  isPreFight?: boolean;
}

export interface PoseResult {
  pose: RikishiPose;
  smoothing: PoseSmoothing;
}

export function poseFighter(input: PoseInput): PoseResult {
  const { fighter, game, nowMs, dtMs, yaw, smoothing } = input;
  const target = poseTarget(fighter, game, nowMs, input.isPreFight ?? false);
  const baseRate = Math.min(1, dtMs * 0.018);
  // 突きの当たる瞬間は補間せず一気に出す（遅れると当たりが見えない）
  const rate = (multiplier: number): number => (fighter.state === "active" ? 1 : clamp01(baseRate * multiplier));

  const next: PoseSmoothing = {
    fx: lerp(smoothing.fx, target.fx, rate(1.4)),
    lz: lerp(smoothing.lz, target.lz, rate(1)),
    sq: lerp(smoothing.sq, target.sq, rate(1)),
    armY: lerp(smoothing.armY, target.armY, rate(1.3)),
    armX: lerp(smoothing.armX, target.armX, rate(1)),
    z: lerp(smoothing.z, target.z, clamp01(dtMs * 0.025)),
    raise: [lerp(smoothing.raise[0], target.raise[0], rate(1.4)), lerp(smoothing.raise[1], target.raise[1], rate(1.4))],
    swing: [lerp(smoothing.swing[0], target.swing[0], rate(1.4)), lerp(smoothing.swing[1], target.swing[1], rate(1.4))],
  };

  const widthScale = 1 / Math.sqrt(next.sq);
  const armPose = (index: 0 | 1): ArmPose => ({
    pivotRotationY: -ARM_SIDES[index] * next.swing[index],
    pivotRotationZ: next.raise[index],
    meshX: next.armX,
  });

  return {
    smoothing: next,
    pose: {
      fx: next.fx,
      lz: next.lz,
      sq: next.sq,
      armY: next.armY,
      armX: next.armX,
      z: next.z,
      position: toWorld(alongAxis(game.pos, fighter.side, fighter.dir, next.fx), next.z, yaw),
      rotationY: yaw + (fighter.side === 1 ? Math.PI : 0),
      leanRotationZ: -next.lz,
      leanScale: { x: widthScale, y: next.sq, z: widthScale },
      arms: [armPose(0), armPose(1)],
      glowColor: target.glowColor,
      glowIntensity: target.glow * GLOW_INTENSITY_SCALE,
    },
  };
}

export const FALL_DURATION_MS = 900;
const FALL_PEAK_HEIGHT = 1.2;
const FALL_SINK_START = 0.7;
const FALL_SHRINK_START = 0.75;
const MIN_FALL_HEIGHT = 0.1;

export interface LoserFall {
  position: Vec3;
  leanRotationZ: number;
  /** root.scale（一様） */
  scale: number;
  /** 0〜1。1 で便器の中に消えた */
  progress: number;
}

/**
 * 敗者が便器へ放物線を描いて落ちる。fallFrom は決着した瞬間の位置を呼び出し側が保持して渡す
 * （毎フレーム現在位置から始めると出発点がずれ続ける）
 */
export function fallLoser(fallFrom: Vec3, loserSide: Side, elapsedSinceEndMs: number): LoserFall {
  const progress = clamp01(elapsedSinceEndMs / FALL_DURATION_MS);
  const toiletX = loserSide === 0 ? -TOILET_X : TOILET_X;
  const travel = Math.min(1, progress * 1.4);
  const sink = progress > FALL_SINK_START ? (progress - FALL_SINK_START) * 3.2 : 0;
  const height = TOP + Math.sin(travel * Math.PI) * FALL_PEAK_HEIGHT - sink;
  return {
    position: { x: lerp(fallFrom.x, toiletX, travel), y: Math.max(MIN_FALL_HEIGHT, height), z: lerp(fallFrom.z, 0, travel) },
    leanRotationZ: progress * 2.2,
    scale: 1 - Math.max(0, progress - FALL_SHRINK_START) * 1.6,
    progress,
  };
}
