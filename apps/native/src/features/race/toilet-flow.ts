// 本編（トイレで記録するときのレース）の画面遷移。game-design.md 1章「1分で必ず終わる・延長や連戦はできない」をここで固める。
// 結果・記録の段階からレースに戻る遷移を作らないことで、画面側がどう呼んでも連戦にならない。
import type { RaceResultView } from "./ui/race-screen-result";

export type ToiletFlowPhase =
  | { phase: "idle" }
  | { phase: "race"; battleId: string }
  | { phase: "result"; battleId: string; result: RaceResultView }
  | { phase: "record"; battleId: string };

export type ToiletFlowAction =
  | { type: "start"; battleId: string }
  | { type: "raceOver"; result: RaceResultView }
  /** やめる・遊ばずに記録だけする。お腹が痛い日の逃げ道（game-design.md 6章） */
  | { type: "skip"; battleId: string }
  | { type: "toRecord" };

export const IDLE_PHASE: ToiletFlowPhase = { phase: "idle" };

export function reduceToiletFlow(state: ToiletFlowPhase, action: ToiletFlowAction): ToiletFlowPhase {
  switch (action.type) {
    case "start":
      return state.phase === "idle" ? { phase: "race", battleId: action.battleId } : state;
    case "skip":
      return state.phase === "idle" || state.phase === "race" ? { phase: "record", battleId: action.battleId } : state;
    case "raceOver":
      return state.phase === "race" ? { phase: "result", battleId: state.battleId, result: action.result } : state;
    case "toRecord":
      return state.phase === "result" ? { phase: "record", battleId: state.battleId } : state;
  }
}
