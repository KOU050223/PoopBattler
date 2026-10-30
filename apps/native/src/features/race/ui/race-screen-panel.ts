// 操作パネルに出すもの。ミニゲームの状態から「パネルの見た目が変わる単位」だけを取り出す。
// 連打のゲージ・針・距離は毎フレーム変わるので shared value に書き、ここには含めない（React の state にしない）
import { MINI_GAME } from "../config";
import type { Minigame } from "../minigames";
import type { Course, MiniGame } from "../types";
import type { SwipeDir } from "./input";

export interface PanelSpec {
  kind: MiniGame;
  /** S字のときだけ。それ以外は空 */
  arrows: readonly SwipeDir[];
  arrowIndex: number;
  /** 予告中の「準備中」パネル。まだ判定していない */
  isReady: boolean;
}

const NO_ARROWS: readonly SwipeDir[] = [];

/**
 * 次のミニゲーム区間が予告の距離に入っているときだけ、その種類を返す。
 * 予告の条件は実況（commentary.ts の applySituation）と同じで、区間の中に入ったら次の区間を見る
 */
export function upcomingZoneOf(course: Course, playerS: number): MiniGame | null {
  const next = course.sections.find((section) => section.kind === "zone" && section.startS > playerS);
  if (!next?.zone || next.startS - playerS >= MINI_GAME.announceAhead) return null;
  return next.zone;
}

/** 区間の中（game あり）は本番、予告中（upcoming あり）は準備中、どちらでもなければ出さない */
export function panelSpecOf(game: Minigame | null, upcoming: MiniGame | null = null): PanelSpec | null {
  if (game) {
    if (game.kind === "swipe") return { kind: "swipe", arrows: game.arrows, arrowIndex: game.arrowIndex, isReady: false };
    return { kind: game.kind, arrows: NO_ARROWS, arrowIndex: 0, isReady: false };
  }
  if (upcoming) return { kind: upcoming, arrows: NO_ARROWS, arrowIndex: 0, isReady: true };
  return null;
}

/** 同じなら React の state を更新しない */
export function isSamePanelSpec(a: PanelSpec | null, b: PanelSpec | null): boolean {
  if (a === null || b === null) return a === b;
  return a.kind === b.kind && a.arrows === b.arrows && a.arrowIndex === b.arrowIndex && a.isReady === b.isReady;
}
