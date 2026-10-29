// プレイヤーの操作を機械で再現するボット（docs/race.md 8章）。
// 試作 HTML には機械操作のコードが無く（node で回したときの使い捨てだった）、8章の表の数値だけが正本。
// 入力は ui/input.ts の InputCommand の形で session.runFrame に渡す。画面と同じ経路を通すため
import type { RaceSession } from "./session";
import { nextHurdleDistance } from "./minigames";
import type { HoldDir, InputCommand } from "./ui/input";

export type BotSkill = "perfect" | "decent" | "idle";

interface BotProfile {
  /** 連打の速さ(回/秒) */
  tapsPerSec: number;
  /** この距離(m)以内になったらハードルをタップする */
  hurdleTapDistanceM: number;
  /** 針がこの位置を超えたら逆側を長押しする */
  bridgeThreshold: number;
  /** 矢印が出てからスワイプするまでの時間(秒) */
  swipeDelaySec: number;
}

const PROFILES: Record<Exclude<BotSkill, "idle">, BotProfile> = {
  perfect: { tapsPerSec: 9, hurdleTapDistanceM: 1.8, bridgeThreshold: 0.08, swipeDelaySec: 0.3 },
  decent: { tapsPerSec: 6, hurdleTapDistanceM: 2.9, bridgeThreshold: 0.35, swipeDelaySec: 0.55 },
};

export interface Bot {
  /** このフレームの入力。nowMs は FrameInput.nowMs と同じ実時間 */
  act(session: RaceSession, nowMs: number): InputCommand[];
}

export function createBot(skill: BotSkill): Bot {
  if (skill === "idle") return { act: () => [] };
  const profile = PROFILES[skill];
  const tapIntervalMs = 1000 / profile.tapsPerSec;
  let nextTapMs = 0;
  let holdDir: HoldDir = 0;

  return {
    act(session, nowMs) {
      const game = session.minigame;
      if (!game) {
        // 区間の外で溜めた連打の予定と、押しっぱなしを持ち越さない
        nextTapMs = nowMs;
        holdDir = 0;
        return [];
      }
      switch (game.kind) {
        case "dash": {
          // 1フレームに複数回ぶんの時間が経っていても、予定した時刻のまま atMs を打つ
          const taps: InputCommand[] = [];
          for (; nextTapMs <= nowMs; nextTapMs += tapIntervalMs) taps.push({ type: "tap", atMs: nextTapMs });
          return taps;
        }
        case "hurdle": {
          const distance = nextHurdleDistance(game, session.race);
          return distance !== null && distance <= profile.hurdleTapDistanceM ? [{ type: "tap", atMs: nowMs }] : [];
        }
        case "bridge": {
          const wanted: HoldDir = game.needle > profile.bridgeThreshold ? -1 : game.needle < -profile.bridgeThreshold ? 1 : 0;
          if (wanted === holdDir) return [];
          holdDir = wanted;
          return [{ type: "hold", dir: wanted }];
        }
        case "swipe": {
          const isDone = game.arrowIndex >= game.arrows.length;
          const elapsedSec = session.race.time - game.arrowStartSec;
          return !isDone && elapsedSec >= profile.swipeDelaySec ? [{ type: "swipe", dir: game.arrows[game.arrowIndex] }] : [];
        }
      }
    },
  };
}
