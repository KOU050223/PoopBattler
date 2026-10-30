/** 物理は 1/120 秒の固定ステップで進める（端末のフレームレートで結果を変えないため。race.md 7章の2） */
export const STEP_SEC = 1 / 120;
/**
 * 1フレームで受け付ける実時間の上限。スパイクや復帰直後に回しすぎて固まる（死のスパイラル）のを防ぐ。
 * 試作のメインループが delta を 0.05 秒で頭打ちにしているのと同じ値
 */
export const MAX_FRAME_DELTA_SEC = 0.05;
export const MAX_STEPS_PER_FRAME = Math.round(MAX_FRAME_DELTA_SEC / STEP_SEC);

/** 時間倍率（race.md 5.2 ハードル / 6.2 写真判定） */
export const TIME_SCALE_NORMAL = 1;
export const TIME_SCALE_HURDLE = 0.4;
export const TIME_SCALE_PHOTO_FINISH = 0.45;

export interface RaceClock {
  /**
   * 描画側の実時間 realDtSec に時間倍率を掛けて溜め、固定ステップに刻む。
   * 実行すべきステップ数を返す（update を呼ぶのは呼び出し側）
   */
  advance(realDtSec: number, timeScale?: number): number;
  /** 実時間の経過。連打の速さはスローの影響を受けないよう、こちらで測る（race.md 7章の4） */
  readonly realElapsedSec: number;
  /** シミュレーション時間の経過（返したステップ数 × STEP_SEC） */
  readonly simElapsedSec: number;
}

export function createRaceClock(maxSteps: number = MAX_STEPS_PER_FRAME): RaceClock {
  let accumulatedSec = 0;
  let realElapsedSec = 0;
  let totalSteps = 0;
  return {
    advance(realDtSec, timeScale = TIME_SCALE_NORMAL) {
      realElapsedSec += realDtSec;
      // 倍率はスロー中の連打判定が変わらないよう実時間側には掛けない。溜める側だけに掛ける
      accumulatedSec += Math.min(realDtSec, MAX_FRAME_DELTA_SEC) * timeScale;
      let steps = 0;
      // 浮動小数の誤差で 60Hz ちょうどの入力が 1 ステップ取りこぼされないよう、わずかに許容する
      while (accumulatedSec >= STEP_SEC - 1e-9 && steps < maxSteps) {
        accumulatedSec -= STEP_SEC;
        steps++;
      }
      if (accumulatedSec >= STEP_SEC) accumulatedSec = 0; // 上限で追いつけなかった分は捨てる
      accumulatedSec = Math.max(0, accumulatedSec);
      totalSteps += steps;
      return steps;
    },
    get realElapsedSec() {
      return realElapsedSec;
    },
    get simElapsedSec() {
      return totalSteps * STEP_SEC;
    },
  };
}
