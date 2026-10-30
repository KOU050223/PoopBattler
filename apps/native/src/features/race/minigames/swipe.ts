// S字（スワイプ）。矢印4つを制限時間内に順に当てる（race.md 5.2）
import { SWIPE } from "../config";
import { pick, type Rng } from "../rng";
import type { ArrowJudge, Race } from "../types";
import type { SwipeDir } from "../ui/input";
import { mean, PLAYER_INDEX, type MinigameOutput } from "./shared";

const DIRECTIONS: readonly SwipeDir[] = ["left", "right", "up", "down"];
/** シミュレーション時間の足し算の誤差で、ちょうど 0.45 秒の正解が遅い扱いにならないようにする */
const TIME_EPSILON = 1e-9;

export interface SwipeState {
  kind: "swipe";
  perf: number;
  arrows: SwipeDir[];
  /** 今の矢印の番号。arrows.length で全部終わり */
  arrowIndex: number;
  /** 今の矢印が出た（シミュレーション）時刻 */
  arrowStartSec: number;
  results: number[];
  /** 指を置いた時点の矢印の番号。スワイプは押した時の矢印にだけ効かせる（指を置いていなければ null で、今の矢印に効く） */
  pressedArrowIndex: number | null;
}

export function beginSwipe(rng: Rng, race: Race, startPerf: number): SwipeState {
  return {
    kind: "swipe",
    perf: startPerf,
    arrows: Array.from({ length: SWIPE.arrows }, () => pick(rng, DIRECTIONS)),
    arrowIndex: 0,
    arrowStartSec: race.time,
    results: [],
    pressedArrowIndex: null,
  };
}

export function judgeArrow(isCorrect: boolean, elapsedSec: number): { judge: ArrowJudge; perf: number } {
  if (!isCorrect) return { judge: "miss", perf: SWIPE.missPerf };
  if (elapsedSec <= SWIPE.fastSec + TIME_EPSILON) return { judge: "fast", perf: SWIPE.fastPerf };
  return { judge: "slow", perf: SWIPE.slowPerf };
}

function resolveArrow(state: SwipeState, race: Race, isCorrect: boolean, out: MinigameOutput): void {
  const { judge, perf } = judgeArrow(isCorrect, race.time - state.arrowStartSec);
  state.results.push(perf);
  state.perf = mean(state.results);
  out.commands.push({ type: "setPerf", runner: PLAYER_INDEX, perf: state.perf });
  // 外すと減速。stumble にしないのは、転倒の実況・演出を出さない試作の挙動に合わせるため
  if (judge === "miss") out.commands.push({ type: "slow", runner: PLAYER_INDEX, durationSec: SWIPE.missSlowSec });
  else out.commands.push({ type: "boost", runner: PLAYER_INDEX, durationSec: SWIPE.correctBoostSec });
  out.events.push({ type: "arrowResult", arrowIndex: state.arrowIndex, judge, perf });
  state.arrowIndex++;
  state.arrowStartSec = race.time;
}

export const isSwipeDone = (state: SwipeState) => state.arrowIndex >= state.arrows.length;

export function pressSwipe(state: SwipeState): void {
  state.pressedArrowIndex = state.arrowIndex;
}

export function swipeSwipe(state: SwipeState, dir: SwipeDir, race: Race, out: MinigameOutput): void {
  if (isSwipeDone(state)) return;
  // 押している間にその矢印が解決済み（時間切れ）なら、次の矢印に流さず捨てる
  if (state.pressedArrowIndex !== null && state.pressedArrowIndex !== state.arrowIndex) return;
  resolveArrow(state, race, dir === state.arrows[state.arrowIndex], out);
}

export function updateSwipe(state: SwipeState, race: Race, out: MinigameOutput): void {
  if (isSwipeDone(state)) return;
  if (race.time - state.arrowStartSec > SWIPE.limitSec) resolveArrow(state, race, false, out);
}

export const swipeAverage = (state: SwipeState) => (state.results.length ? mean(state.results) : SWIPE.missPerf);
