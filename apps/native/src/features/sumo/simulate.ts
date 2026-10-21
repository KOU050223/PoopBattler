// NPC 同士を回してバランスを測る（docs/battle.md 4.3）。UI からは使わない
import { MODE_FULL, SPECIES } from "./config";
import { STEP_MS } from "./clock";
import { newGame, update } from "./engine";
import { createRng } from "./rng";
import type { Difficulty, Mode } from "./types";

/** これを超えて決着しない取組は無限ループ扱い（ロジック時間） */
const MAX_MATCH_MS = 10 * 60 * 1000;

export interface SimulationResult {
  matches: number;
  unfinished: number;
  eastWinRate: number;
  /** 取組の長さ(秒, 時間倍率を戻した実時間) */
  averageSeconds: number;
  maxSeconds: number;
  /** 種族ごとの勝率（同種対戦も含む） */
  winRateBySpecies: Record<string, number>;
}

export function simulateMatches(options: { count: number; seed: number; diff: Difficulty; mode?: Mode }): SimulationResult {
  const mode = options.mode ?? MODE_FULL;
  const wins: Record<string, number> = {};
  const played: Record<string, number> = {};
  let eastWins = 0;
  let unfinished = 0;
  let totalSeconds = 0;
  let maxSeconds = 0;
  for (let index = 0; index < options.count; index++) {
    // 9通りの組み合わせを均等に回す
    const east = SPECIES[index % SPECIES.length];
    const west = SPECIES[Math.floor(index / SPECIES.length) % SPECIES.length];
    const game = newGame({
      speciesEast: east,
      speciesWest: west,
      diff: options.diff,
      mode,
      rand: createRng(options.seed + index),
      npc: [true, true],
    });
    while (game.phase === "fight" && game.t < MAX_MATCH_MS) update(game, STEP_MS);
    if (game.phase === "fight") {
      unfinished++;
      continue;
    }
    const seconds = game.t / mode.timeScale / 1000;
    totalSeconds += seconds;
    maxSeconds = Math.max(maxSeconds, seconds);
    const winner = game.winner === 0 ? east : west;
    if (game.winner === 0) eastWins++;
    wins[winner.id] = (wins[winner.id] ?? 0) + 1;
    played[east.id] = (played[east.id] ?? 0) + 1;
    played[west.id] = (played[west.id] ?? 0) + 1;
  }
  const finished = options.count - unfinished;
  return {
    matches: options.count,
    unfinished,
    eastWinRate: eastWins / finished,
    averageSeconds: totalSeconds / finished,
    maxSeconds,
    winRateBySpecies: Object.fromEntries(SPECIES.map((sp) => [sp.id, (wins[sp.id] ?? 0) / (played[sp.id] ?? 1)])),
  };
}
