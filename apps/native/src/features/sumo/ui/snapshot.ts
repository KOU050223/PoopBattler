// ロジックの Game から HUD 用の小さな値だけを取り出す。毎フレーム React に流さず、
// 変化があったときだけ更新するために、値は丸めて比較しやすい形にしておく。
import { CFG } from "../config";
import type { Fighter, Game, Side } from "../types";
import {
  clinchHudOf,
  fanStateOf,
  heatRatio,
  telegraphOf,
  warnDirOf,
  type ClinchHud,
  type FanState,
  type Telegraph,
} from "./hud";
import { DIR_LEFT, DIR_RIGHT } from "./input";

export interface FighterHud {
  /** 息 0〜100 */
  stamina: number;
  /** 必殺ゲージ 0〜100 */
  special: number;
  /** 熱の残り 0〜1。熱でなければ 0 */
  heat: number;
}

export interface HudSnapshot {
  position: number;
  fighters: [FighterHud, FighterHud];
  /** 相手の頭上に出す予告マーク。なければ null */
  telegraph: Telegraph | null;
  fans: { right: FanState; left: FanState };
  clinch: ClinchHud | null;
  isEnded: boolean;
  winner: Side | null;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

export function snapshotOf(game: Game, playerSide: Side): HudSnapshot {
  const player = game.f[playerSide];
  const opponent = game.f[1 - playerSide];
  const hud = (f: Fighter): FighterHud => ({ stamina: Math.round(f.stam), special: Math.round(f.gauge), heat: round2(heatRatio(f)) });
  const telegraph = telegraphOf(opponent);
  const warnDir = warnDirOf(game, opponent);
  return {
    position: Math.round(Math.max(-CFG.OUT, Math.min(CFG.OUT, game.pos))),
    // 東・西の順。プレイヤーがどちらでも並びは変えない（東=左 / 西=右の表示に対応）
    fighters: [hud(game.f[0]), hud(game.f[1])],
    telegraph: telegraph && { ...telegraph, ring: round2(telegraph.ring) },
    fans: { right: fanStateOf(player, DIR_RIGHT, warnDir), left: fanStateOf(player, DIR_LEFT, warnDir) },
    clinch: clinchHudOf(game),
    isEnded: game.phase === "end",
    winner: game.winner,
  };
}

export function isSameSnapshot(a: HudSnapshot, b: HudSnapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
