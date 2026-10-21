// ロジックの Game から HUD 用の小さな値だけを取り出す。毎フレーム React に流さず、
// 変化があったときだけ更新するために、値は丸めて比較しやすい形にしておく。
import { CFG } from "../config";
import type { Fighter, Game, Side } from "../types";
import { DIR_LEFT, DIR_RIGHT, type SideDir } from "./input";
import { stateMark, type StateMark } from "./labels";

export interface FighterHud {
  stamina: number;
  special: number;
  mark: StateMark;
  isHot: boolean;
  /** 守りの向き（扇の点灯用）。守っていなければ null */
  guardDir: SideDir | null;
}

export interface HudSnapshot {
  position: number;
  fighters: [FighterHud, FighterHud];
  isClinch: boolean;
  isEnded: boolean;
  winner: Side | null;
  /** 相手の突きが来る側（序ノ口・幕下の予告）。なければ null */
  threatDir: SideDir | null;
}

const toSideDir = (dir: number): SideDir => (dir === DIR_RIGHT ? DIR_RIGHT : DIR_LEFT);

export function snapshotOf(game: Game): HudSnapshot {
  const [east, west] = game.f;
  const hud = (f: Fighter): FighterHud => ({
    stamina: Math.round(f.stam),
    special: Math.round(f.gauge),
    mark: stateMark(f),
    isHot: f.hot > 0,
    guardDir: f.state === "inashi" ? toSideDir(f.idir) : null,
  });
  const isThreatening = game.diff.guide && west.state === "windup" && west.move === "tsuki";
  return {
    position: Math.round(Math.max(-CFG.OUT, Math.min(CFG.OUT, game.pos))),
    fighters: [hud(east), hud(west)],
    isClinch: game.clinch !== null,
    isEnded: game.phase === "end",
    winner: game.winner,
    threatDir: isThreatening ? toSideDir(west.dir7) : null,
  };
}

export function isSameSnapshot(a: HudSnapshot, b: HudSnapshot): boolean {
  const sameFighter = (x: FighterHud, y: FighterHud) =>
    x.stamina === y.stamina &&
    x.special === y.special &&
    x.mark.label === y.mark.label &&
    x.isHot === y.isHot &&
    x.guardDir === y.guardDir;
  return (
    a.position === b.position &&
    a.isClinch === b.isClinch &&
    a.isEnded === b.isEnded &&
    a.winner === b.winner &&
    a.threatDir === b.threatDir &&
    sameFighter(a.fighters[0], b.fighters[0]) &&
    sameFighter(a.fighters[1], b.fighters[1])
  );
}
