import { DIFFICULTIES, MODES, SPECIES } from "../config";
import { newGame } from "../engine";
import { createRng } from "../rng";
import type { Difficulty, Game, Mode, Species, SumoEvent } from "../types";

/** 開始前の画面で選ぶ内容 */
export interface MatchSetup {
  difficulty: Difficulty;
  playerSpecies: Species;
  opponentSpecies: Species;
  mode: Mode;
}

export const DEFAULT_SETUP: MatchSetup = {
  difficulty: DIFFICULTIES[0],
  playerSpecies: SPECIES[0],
  opponentSpecies: SPECIES[1],
  mode: MODES[0],
};

/** プレイヤーは東、NPC は西 */
export const PLAYER_SIDE = 0;

export function createMatch(setup: MatchSetup, onEvent: (event: SumoEvent) => void, seed: number): Game {
  return newGame({
    speciesEast: setup.playerSpecies,
    speciesWest: setup.opponentSpecies,
    diff: setup.difficulty,
    mode: setup.mode,
    rand: createRng(seed),
    onEvent,
    npc: [false, true],
  });
}
