// 自分のミニゲームの状態機械。区間の種類ごとの state を、入力・ステップ・区間の出入りで動かす。
// エンジンへは RaceCommand を、UI へは MinigameEvent を返すだけで、時間倍率の要求は state から読む
import { MINI_GAME } from "../config";
import type { MiniGame, Race } from "../types";
import type { InputCommand } from "../ui/input";
import { beginBridge, bridgeAverage, updateBridge, type BridgeState } from "./bridge";
import { beginDash, dashAverage, tapDash, updateDash, type DashState } from "./dash";
import { beginHurdle, hurdleAverage, isHurdleSlowMoment, tapHurdle, updateHurdle, type HurdleState } from "./hurdle";
import { gradeOf, PLAYER_INDEX, type MinigameOutput } from "./shared";
import { beginSwipe, swipeAverage, swipeSwipe, updateSwipe, type SwipeState } from "./swipe";

export * from "./shared";
export * from "./dash";
export * from "./hurdle";
export * from "./bridge";
export * from "./swipe";

export type Minigame = DashState | HurdleState | BridgeState | SwipeState;

/** 区間に入る。出来の初期値はエンジンが入れたものと同じ（ダッシュだけ低い） */
export function enterZone(race: Race, zone: MiniGame, zoneIndex: number, out: MinigameOutput): Minigame {
  out.events.push({ type: "begin", zone, zoneIndex });
  switch (zone) {
    case "dash":
      return beginDash();
    case "hurdle":
      return beginHurdle(MINI_GAME.perfStart);
    case "bridge":
      return beginBridge(race.rng, MINI_GAME.perfStart);
    case "swipe":
      return beginSwipe(race.rng, race, MINI_GAME.perfStart);
  }
}

export function averageOf(game: Minigame): number {
  switch (game.kind) {
    case "dash":
      return dashAverage(game);
    case "hurdle":
      return hurdleAverage(game);
    case "bridge":
      return bridgeAverage(game);
    case "swipe":
      return swipeAverage(game);
  }
}

export function exitZone(game: Minigame, zoneIndex: number, out: MinigameOutput): void {
  const average = averageOf(game);
  if (game.kind === "bridge") out.commands.push({ type: "setBridgeNeedle", runner: PLAYER_INDEX, needle: null });
  out.events.push({ type: "end", zone: game.kind, zoneIndex, grade: gradeOf(average), average });
}

/** 指を置いた瞬間のタップ・長押し・スワイプのうち、この区間で使うものだけを受ける */
export function applyInput(game: Minigame, race: Race, input: InputCommand, out: MinigameOutput): void {
  switch (game.kind) {
    case "dash":
      if (input.type === "tap") tapDash(game, input.atMs, out);
      return;
    case "hurdle":
      if (input.type === "tap") tapHurdle(game, race, out);
      return;
    case "bridge":
      if (input.type === "hold") game.holdDir = input.dir;
      return;
    case "swipe":
      if (input.type === "swipe") swipeSwipe(game, input.dir, race, out);
      return;
  }
}

/** 1ステップぶん。nowMs は連打の時刻（InputCommand.atMs）と同じ実時間の時計 */
export function updateMinigame(game: Minigame, race: Race, nowMs: number, out: MinigameOutput): void {
  switch (game.kind) {
    case "dash":
      updateDash(game, nowMs, out);
      return;
    case "hurdle":
      updateHurdle(game, race, out);
      return;
    case "bridge":
      updateBridge(game, out);
      return;
    case "swipe":
      updateSwipe(game, race, out);
      return;
  }
}

/** ハードル直前にスローを求めるか。時計に渡すのは呼び出し側 */
export const wantsHurdleSlow = (game: Minigame | null, race: Race): boolean =>
  game !== null && game.kind === "hurdle" && isHurdleSlowMoment(game, race);
