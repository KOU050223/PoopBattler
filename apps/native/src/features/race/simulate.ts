// 機械に対戦させて、プレイヤーの平均着順を測る（docs/race.md 8章）。UI からは使わない
import { createBot, type BotSkill } from "./bots";
import { RUNNER_COUNT } from "./config";
import { createSession, runFrame } from "./session";
import type { RunnerStats } from "./types";

/** 試作のプリセット（体力 / パワー / 技術。合計15） */
export const STAT_PRESETS = {
  balance: { stamina: 5, power: 5, technique: 5 },
  power: { stamina: 4, power: 8, technique: 3 },
  stamina: { stamina: 8, power: 3, technique: 4 },
  technique: { stamina: 3, power: 4, technique: 8 },
  twinBlade: { stamina: 7, power: 7, technique: 1 },
} as const satisfies Record<string, RunnerStats>;

export type StatPresetKey = keyof typeof STAT_PRESETS;

const FRAME_SEC = 1 / 60;
/** 暴走して決着しないレースを打ち切る上限（実時間 秒） */
const MAX_RACE_SEC = 300;

const RUNNER_NAMES = Array.from({ length: RUNNER_COUNT }, (_, index) => `走者${index}`);

export interface SimulationOptions {
  count: number;
  seed: number;
  stats: RunnerStats;
  skill: BotSkill;
}

export interface SimulationResult {
  races: number;
  unfinished: number;
  /** 自分の平均着順（1始まり） */
  averagePlace: number;
}

/** 1レースを回して、自分の着順を返す。決着しなければ null */
export function simulateRace(options: { seed: number; stats: RunnerStats; skill: BotSkill }): number | null {
  const session = createSession({
    seed: options.seed,
    racers: { player: options.stats },
    collisions: true,
    runnerNames: RUNNER_NAMES,
  });
  const bot = createBot(options.skill);
  let place: number | null = null;
  for (let frame = 0; frame * FRAME_SEC < MAX_RACE_SEC && !session.isOver; frame++) {
    const nowMs = frame * FRAME_SEC * 1000;
    const result = runFrame(session, { realDtSec: FRAME_SEC, nowMs, inputs: bot.act(session, nowMs) });
    for (const event of result.raceEvents) if (event.type === "finish" && event.runner === 0) place = event.place;
  }
  return place;
}

export function simulateRaces(options: SimulationOptions): SimulationResult {
  let totalPlace = 0;
  let unfinished = 0;
  for (let index = 0; index < options.count; index++) {
    const place = simulateRace({ seed: options.seed + index, stats: options.stats, skill: options.skill });
    if (place === null) unfinished++;
    else totalPlace += place;
  }
  return { races: options.count, unfinished, averagePlace: totalPlace / (options.count - unfinished) };
}
