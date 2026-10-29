import { createRace } from "../engine";
import type { Race } from "../types";
import { PLAYER_INDEX } from "./shared";

const STATS = { stamina: 5, power: 5, technique: 5 };
export const SEED = 20260101;

export const makeRace = (): Race => createRace({ seed: SEED, racers: { player: STATS }, collisions: false });

/** 自分を、最初のハードルの手前 distance(m) に置く */
export function placeBeforeFirstHurdle(race: Race, distance: number): void {
  race.runners[PLAYER_INDEX].s = race.course.hurdles[0].s - distance;
}
