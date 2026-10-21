/** 立ち上がりに使う割合 */
export const SLOWMO_RAMP_IN = 0.12;
/** この割合を過ぎたら通常速度へ戻し始める */
export const SLOWMO_RAMP_OUT_START = 0.7;
export const SLOWMO_MIN_SCALE = 0.15;

export interface SlowmoState {
  startMs: number;
  untilMs: number;
}

export const NO_SLOWMO: SlowmoState = { startMs: 0, untilMs: 0 };

const lerp = (from: number, to: number, ratio: number): number => from + (to - from) * ratio;

/** 後から呼ばれた方で上書きする（試作と同じ）。durationMs <= 0 は何もしない */
export function startSlowmo(state: SlowmoState, nowMs: number, durationMs: number): SlowmoState {
  if (durationMs <= 0) return state;
  return { startMs: nowMs, untilMs: nowMs + durationMs };
}

/** ロジックへ渡す経過時間に掛ける係数。1 → 0.15 へ素早く落ち、70%以降で 1 へ戻る */
export function slowmoScale(state: SlowmoState, nowMs: number): number {
  if (nowMs >= state.untilMs) return 1;
  const progress = Math.max(0, (nowMs - state.startMs) / (state.untilMs - state.startMs));
  if (progress < SLOWMO_RAMP_IN) return lerp(1, SLOWMO_MIN_SCALE, progress / SLOWMO_RAMP_IN);
  if (progress > SLOWMO_RAMP_OUT_START) {
    return lerp(SLOWMO_MIN_SCALE, 1, (progress - SLOWMO_RAMP_OUT_START) / (1 - SLOWMO_RAMP_OUT_START));
  }
  return SLOWMO_MIN_SCALE;
}
