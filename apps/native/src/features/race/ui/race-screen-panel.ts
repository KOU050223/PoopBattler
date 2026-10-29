// 操作パネルに出すもの。ミニゲームの状態から「パネルの見た目が変わる単位」だけを取り出す。
// 連打のゲージ・針・距離は毎フレーム変わるので shared value に書き、ここには含めない（React の state にしない）
import type { Minigame } from "../minigames";
import type { MiniGame } from "../types";
import type { SwipeDir } from "./input";

export interface PanelSpec {
  kind: MiniGame;
  /** S字のときだけ。それ以外は空 */
  arrows: readonly SwipeDir[];
  arrowIndex: number;
}

const NO_ARROWS: readonly SwipeDir[] = [];

export function panelSpecOf(game: Minigame | null): PanelSpec | null {
  if (!game) return null;
  if (game.kind === "swipe") return { kind: "swipe", arrows: game.arrows, arrowIndex: game.arrowIndex };
  return { kind: game.kind, arrows: NO_ARROWS, arrowIndex: 0 };
}

/** 同じなら React の state を更新しない */
export function isSamePanelSpec(a: PanelSpec | null, b: PanelSpec | null): boolean {
  if (a === null || b === null) return a === b;
  return a.kind === b.kind && a.arrows === b.arrows && a.arrowIndex === b.arrowIndex;
}
