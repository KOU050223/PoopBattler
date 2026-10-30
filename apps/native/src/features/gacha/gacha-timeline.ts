// 演出を「経過時間 → その瞬間の状態」の純粋関数にする。three に依存させず、テストで時間配分の形を固定する。
// 流れ: 上アングルで石が浮く → 石が落ちる(drop、開口へ寄る) → 加速回転しながら小さくなる(spin, ドラムロール)
//       → 止まってカメラが寄る(slam, デン！) → 結果(done)。

const DEG_TO_RAD = Math.PI / 180;

export const DROP_MS = 700;
export const SPIN_MS = 2200;
export const SLAM_MS = 650;
export const TOTAL_MS = DROP_MS + SPIN_MS + SLAM_MS;
// 視差効果を減らす設定では、回転・カメラ移動を省いて短い待ちだけにする。
export const REDUCED_MS = 400;

export type CameraPose = { distance: number; elevationDeg: number };
export const IDLE_CAMERA: CameraPose = { distance: 4.6, elevationDeg: 60 };
// 石が落ちる間に開口へ寄る。ここから回転で一気に引く落差が「ドラムロール」の勢いになる。
export const DROP_CAMERA: CameraPose = { distance: 2.9, elevationDeg: 58 };
export const WIDE_CAMERA: CameraPose = { distance: 9.5, elevationDeg: 24 };
export const RESULT_CAMERA: CameraPose = { distance: 5.6, elevationDeg: 20 };

export const SPIN_TURNS = 10;
export const MIN_TOILET_SCALE = 0.22;
const SPIN_EASE_POWER = 2.4;
const SWIRL_TURNS = 3;
// 水が引き始める進み具合。それまでは渦の回転だけ。
const DRAIN_START = 0.35;

export type Phase = "idle" | "drop" | "spin" | "slam" | "done";

export type TimelineFrame = {
  phase: Phase;
  camera: CameraPose;
  /** 便器の向き（ラジアン）。slam 以降は正面（0）。 */
  toiletYaw: number;
  toiletScale: number;
  /** 石の落下の進み 0〜1。null は石が見えない。 */
  stoneProgress: number | null;
  /** 水と渦に使う、回転フェーズの進み 0〜1。 */
  spinProgress: number;
  isHandlePressed: boolean;
};

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
const easeInQuad = (t: number) => t * t;
const easeInPow = (t: number, power: number) => t ** power;
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
// 目標を一度行き過ぎて戻る。「デン！」の弾み。
const OVERSHOOT = 1.9;
const easeOutBack = (t: number) => 1 + (OVERSHOOT + 1) * (t - 1) ** 3 + OVERSHOOT * (t - 1) ** 2;
const lerpCamera = (from: CameraPose, to: CameraPose, t: number): CameraPose => ({
  distance: lerp(from.distance, to.distance, t),
  elevationDeg: lerp(from.elevationDeg, to.elevationDeg, t),
});

const IDLE_FRAME: TimelineFrame = {
  phase: "idle",
  camera: IDLE_CAMERA,
  toiletYaw: 0,
  toiletScale: 1,
  stoneProgress: 0,
  spinProgress: 0,
  isHandlePressed: false,
};

/** `elapsedMs` が null なら演出前（待機）。 */
export function frameAt(elapsedMs: number | null, isReduced = false): TimelineFrame {
  if (elapsedMs === null) return IDLE_FRAME;
  const elapsed = Math.max(0, elapsedMs);

  if (isReduced) {
    const phase: Phase = elapsed >= REDUCED_MS ? "done" : "spin";
    return { ...IDLE_FRAME, phase, camera: RESULT_CAMERA, stoneProgress: null, spinProgress: phase === "done" ? 1 : 0 };
  }

  if (elapsed < DROP_MS) {
    const t = elapsed / DROP_MS;
    return { ...IDLE_FRAME, phase: "drop", camera: lerpCamera(IDLE_CAMERA, DROP_CAMERA, easeInOutCubic(t)), stoneProgress: easeInQuad(t) };
  }

  if (elapsed < DROP_MS + SPIN_MS) {
    const p = (elapsed - DROP_MS) / SPIN_MS;
    return {
      phase: "spin",
      camera: lerpCamera(DROP_CAMERA, WIDE_CAMERA, easeInOutCubic(p)),
      toiletYaw: Math.PI * 2 * SPIN_TURNS * easeInPow(p, SPIN_EASE_POWER),
      toiletScale: lerp(1, MIN_TOILET_SCALE, easeInOutCubic(p)),
      stoneProgress: null,
      spinProgress: p,
      isHandlePressed: true,
    };
  }

  if (elapsed < TOTAL_MS) {
    const q = (elapsed - DROP_MS - SPIN_MS) / SLAM_MS;
    return {
      phase: "slam",
      camera: lerpCamera(WIDE_CAMERA, RESULT_CAMERA, easeOutExpo(q)),
      toiletYaw: 0,
      toiletScale: lerp(MIN_TOILET_SCALE, 1, easeOutBack(q)),
      stoneProgress: null,
      spinProgress: 1,
      isHandlePressed: false,
    };
  }

  return { ...IDLE_FRAME, phase: "done", camera: RESULT_CAMERA, stoneProgress: null, spinProgress: 1 };
}

/** 回転フェーズの進み 0→1 に対する水面の高さ倍率（1=満水、0=空）。 */
export function waterLevel(spinProgress: number): number {
  if (spinProgress <= DRAIN_START) return 1;
  return Math.max(0, 1 - (spinProgress - DRAIN_START) / (1 - DRAIN_START));
}

/** 渦の粒の回転角（ラジアン）。 */
export function swirlAngle(spinProgress: number): number {
  return -spinProgress * SWIRL_TURNS * Math.PI * 2;
}

/** カメラの位置。注視点 `targetY` の真上〜斜め前の球面上に置く（x は常に 0）。 */
export function cameraPosition(pose: CameraPose, targetY: number): [number, number, number] {
  const elevation = pose.elevationDeg * DEG_TO_RAD;
  return [0, targetY + pose.distance * Math.sin(elevation), pose.distance * Math.cos(elevation)];
}
