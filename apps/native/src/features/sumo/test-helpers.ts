import { SPECIES } from "./config";
import { DIFF_MAKUSHITA } from "./config";
import { STEP_MS } from "./clock";
import { newGame, update } from "./engine";
import { createRng } from "./rng";
import type { Game, Mode, SumoEvent } from "./types";

/** 両者とも手動操作のゲーム。イベントは events に溜まる */
export function manualGame(options: { mode?: Mode; seed?: number } = {}): { game: Game; events: SumoEvent[] } {
  const events: SumoEvent[] = [];
  const game = newGame({
    speciesEast: SPECIES[0],
    speciesWest: SPECIES[0],
    diff: DIFF_MAKUSHITA,
    mode: options.mode,
    rand: createRng(options.seed ?? 1),
    onEvent: (event) => events.push(event),
    npc: [false, false],
  });
  return { game, events };
}

export function runSteps(game: Game, steps: number): void {
  for (let i = 0; i < steps; i++) update(game, STEP_MS);
}
