import { update } from "./engine";
import type { Game } from "./types";

/** ロジックは 1/60 秒の固定ステップで進める（端末の性能差で結果を変えないため） */
export const STEP_MS = 1000 / 60;
/** 1フレームで追従するステップ数の上限。重い端末で遅れを取り戻そうとして固まる（死のスパイラル）のを防ぐ */
export const MAX_STEPS_PER_FRAME = 5;

export interface Stepper {
  /**
   * 実時間 realDtMs を進める。モードの時間倍率（と UI のスロー演出 extraScale）を掛けてから
   * 固定ステップに刻む。実行したステップ数を返す
   */
  advance(realDtMs: number, extraScale?: number): number;
}

export function createStepper(game: Game, maxSteps: number = MAX_STEPS_PER_FRAME): Stepper {
  let accumulatedMs = 0;
  return {
    advance(realDtMs, extraScale = 1) {
      accumulatedMs += realDtMs * game.mode.timeScale * extraScale;
      let steps = 0;
      // 浮動小数の誤差で 60Hz ちょうどの入力が 1 ステップ取りこぼされないよう、わずかに許容する
      while (accumulatedMs >= STEP_MS - 1e-6 && steps < maxSteps) {
        update(game, STEP_MS);
        accumulatedMs -= STEP_MS;
        steps++;
      }
      if (accumulatedMs >= STEP_MS) accumulatedMs = 0; // 上限に達して追いつけなかった分は捨てる
      return steps;
    },
  };
}
