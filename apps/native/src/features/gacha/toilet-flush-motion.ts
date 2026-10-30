// 流す演出の時間配分。three に依存しない純粋関数にして、テストで形を確かめる。
export const FLUSH_DURATION_MS = 1800;
export const REDUCED_FLUSH_DURATION_MS = 400;
export const SWIRL_TURNS = 3;
export const SHAKE_AMPLITUDE = 0.04;
const SHAKE_CYCLES = 6;
// 水が引き始める進み具合。それまでは揺れと渦の回転だけ。
const DRAIN_START = 0.35;

export function flushProgress(elapsedMs: number, durationMs: number): number {
  return Math.min(1, Math.max(0, elapsedMs / durationMs));
}

/** 進み 0→1 に対する水面の高さ倍率（1=満水、0=空）。 */
export function waterLevel(progress: number): number {
  if (progress <= DRAIN_START) return 1;
  return Math.max(0, 1 - (progress - DRAIN_START) / (1 - DRAIN_START));
}

/** 渦の回転角（ラジアン）。 */
export function swirlAngle(progress: number): number {
  return -progress * SWIRL_TURNS * Math.PI * 2;
}

/** 便器全体の横揺れ。最初と最後は 0 で、飛び出さずに止まる。 */
export function shakeOffset(progress: number): number {
  const envelope = Math.sin(progress * Math.PI);
  return Math.sin(progress * SHAKE_CYCLES * Math.PI * 2) * SHAKE_AMPLITUDE * envelope;
}
