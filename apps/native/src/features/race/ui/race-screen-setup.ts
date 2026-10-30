// セットアップの選択肢と、それをレースの開始条件に変える関数。試作 race-minigame.html の PRESETS / OPP_NAMES / ME と同じ
import { createRng, shuffle } from "../rng";
import type { RunnerStats } from "../types";
import { RUNNER_COUNT } from "../config";
import type { RaceOptions } from "../engine";

/** 走者の名前の先頭は自分（試作の ME.name） */
export const PLAYER_NAME = "うんちくん";
/** 結果の表で自分を指すときの呼び名（試作の ME.short） */
export const PLAYER_SHORT_NAME = "じぶん";

export const OPPONENT_NAMES = ["コロ丸", "ベン太", "ぽっとん", "カタ吉", "ゆる助", "モリ子", "ブリオ", "ちょろ美"] as const;

export interface StatPreset {
  id: string;
  name: string;
  stats: RunnerStats;
}

/** 合計はどれも15 */
export const STAT_PRESETS: readonly StatPreset[] = [
  { id: "balance", name: "バランス", stats: { stamina: 5, power: 5, technique: 5 } },
  { id: "power", name: "パワー型", stats: { stamina: 4, power: 8, technique: 3 } },
  { id: "stamina", name: "体力型", stats: { stamina: 8, power: 3, technique: 4 } },
  { id: "technique", name: "技術型", stats: { stamina: 3, power: 4, technique: 8 } },
  { id: "dual", name: "二刀流", stats: { stamina: 7, power: 7, technique: 1 } },
];

export interface RaceSetup {
  presetId: string;
  isCollisions: boolean;
}

export const DEFAULT_SETUP: RaceSetup = { presetId: STAT_PRESETS[0].id, isCollisions: true };

export type SessionOptions = RaceOptions & { runnerNames: readonly string[] };

/** 開始ごとに変わるシード。32bit に収めるのは、表示した数字でそのまま再現できるようにするため */
export function seedOfClock(nowMs: number): number {
  return Math.floor(nowMs) >>> 0;
}

function presetOf(presetId: string): StatPreset {
  return STAT_PRESETS.find((preset) => preset.id === presetId) ?? STAT_PRESETS[0];
}

export function buildSessionOptions(setup: RaceSetup, seed: number): SessionOptions {
  return buildPlayerSessionOptions(presetOf(setup.presetId).stats, setup.isCollisions, seed);
}

/** 走者のステータスを直接渡して開始条件を作る。本編は相棒のステータスをここへ渡す */
export function buildPlayerSessionOptions(playerStats: RunnerStats, isCollisions: boolean, seed: number): SessionOptions {
  // 名前の並びはレース本体の乱数を使わず、別に作る。名前を変えてもレースの展開が変わらないように
  const opponentNames = shuffle(createRng(seed), OPPONENT_NAMES).slice(0, RUNNER_COUNT - 1);
  return {
    seed,
    racers: { player: { ...playerStats } },
    collisions: isCollisions,
    runnerNames: [PLAYER_NAME, ...opponentNames],
  };
}

export const statsLabel = (stats: RunnerStats): string => `体${stats.stamina}・パ${stats.power}・技${stats.technique}`;
