import { DIFFICULTIES, MODES, SPECIES } from "../config";
import { newGame } from "../engine";
import { createRng } from "../rng";
import type { Difficulty, Game, Mode, Species, SumoEvent } from "../types";

/** 開始前の画面で選ぶ内容 */
export interface MatchSetup {
  difficulty: Difficulty;
  playerSpecies: Species;
  opponentSpecies: Species;
  /** true なら取組を始めるとき、自分と違う種族から相手を選ぶ（「おまかせ」） */
  isOpponentRandom: boolean;
  mode: Mode;
}

export const DEFAULT_SETUP: MatchSetup = {
  difficulty: DIFFICULTIES[0],
  playerSpecies: SPECIES[0],
  opponentSpecies: SPECIES[1],
  isOpponentRandom: true,
  mode: MODES[0],
};

/** 取組を始める前に、おまかせの相手を決める。rand は 0以上1未満の乱数 */
export function resolveOpponent(setup: MatchSetup, rand: () => number): MatchSetup {
  if (!setup.isOpponentRandom) return setup;
  const candidates = SPECIES.filter((species) => species.id !== setup.playerSpecies.id);
  const picked = candidates[Math.min(candidates.length - 1, Math.floor(rand() * candidates.length))];
  return { ...setup, opponentSpecies: picked ?? setup.opponentSpecies };
}

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
