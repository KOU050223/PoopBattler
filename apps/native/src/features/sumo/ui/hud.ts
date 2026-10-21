// HUD の表示値を決める純関数。ロジックの Fighter / Game / SumoEvent を読むだけで、描画には依存しない。
// 見た目の段階分けは試作（うんちくん相撲 実験版）の hud() に合わせてある。
import { CFG } from "../config";
import type { Fighter, Game, Side } from "../types";
import { DIR_LEFT, DIR_RIGHT, type SideDir } from "./input";

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const clamp01 = (value: number): number => clamp(value, 0, 1);

export const toSideDir = (dir: number): SideDir => (dir === DIR_RIGHT ? DIR_RIGHT : DIR_LEFT);
/** 左右以外（真上など）の方向には矢印を出さない */
const arrowDirOf = (dir: number): SideDir | null => (dir === DIR_RIGHT || dir === DIR_LEFT ? dir : null);

// ---- 息チューブ ----

export type StaminaTone = "high" | "mid" | "low";
/** この値以上なら緑 */
export const STAMINA_HIGH_FROM = 50;
/** この値未満なら赤（息切れ警告）。間は黄 */
export const STAMINA_LOW_BELOW = 22;
/** 白い残像が減る速さ（息の目盛り/ms）。試作は 60fps で毎フレーム 0.96 */
const GHOST_DRAIN_PER_MS = 0.06;

export function staminaTone(stamina: number): StaminaTone {
  if (stamina >= STAMINA_HIGH_FROM) return "high";
  if (stamina >= STAMINA_LOW_BELOW) return "mid";
  return "low";
}

export const isStaminaLow = (stamina: number): boolean => staminaTone(stamina) === "low";

/** 息が減ったあと、白い残像が現在値まで縮むのにかける時間(ms)。増えたときや変化なしは 0 */
export function ghostDrainMs(ghost: number, stamina: number): number {
  return ghost > stamina ? (ghost - stamina) / GHOST_DRAIN_PER_MS : 0;
}

// ---- 土俵位置バー ----

/** 位置 0 のときの割合は 50%。±OUT で端の便器（4% / 96%）に届く */
const TRACK_HALF_SPAN_PERCENT = 46;

/** 現在位置マーカーの左端からの割合(%)。右へ寄るほど東が押している（西が土俵を割る側） */
export function positionPercent(position: number): number {
  return 50 + clamp(position / CFG.OUT, -1, 1) * TRACK_HALF_SPAN_PERCENT;
}

export interface EdgeZones {
  /** 東側の土俵際（左）。left と width は % */
  east: { left: number; width: number };
  west: { left: number; width: number };
}

/** 土俵際（押されると息や受けが変わる範囲）をバー上の帯にする */
export function edgeZones(): EdgeZones {
  const eastStart = positionPercent(-CFG.OUT);
  const width = positionPercent(-CFG.EDGE) - eastStart;
  return { east: { left: eastStart, width }, west: { left: positionPercent(CFG.OUT) - width, width } };
}

// ---- 必殺ゲージ ----

export const specialRatio = (gauge: number): number => clamp01(gauge / 100);
export const isSpecialReady = (gauge: number): boolean => gauge >= 100;

// ---- 予告マーク（相手の頭上にあたるもの） ----

export type TelegraphTone = "tsuki" | "grab" | "parry" | "dodge" | "special" | "down";
export type TelegraphGlyph = "突" | "四" | "受" | "避" | "！" | "構" | "崩";

export interface Telegraph {
  glyph: TelegraphGlyph;
  tone: TelegraphTone;
  /** リングの満ち具合 0〜1 */
  ring: number;
  /** 突きの来る方向。方向がないマークは null */
  arrow: SideDir | null;
}

const ratioOf = (elapsed: number, duration: number): number => (duration > 0 ? clamp01(elapsed / duration) : 1);

/** 相手の状態を、予告マーク1つにまとめる。何も出さないときは null */
export function telegraphOf(opponent: Fighter): Telegraph | null {
  const f = opponent;
  switch (f.state) {
    case "windup":
      if (f.move === "tsuki") {
        return { glyph: "突", tone: f.special ? "special" : "tsuki", ring: ratioOf(f.t, f.dur), arrow: arrowDirOf(f.dir7) };
      }
      return { glyph: "四", tone: f.special ? "special" : "grab", ring: clamp01(f.charge), arrow: null };
    case "inashi":
      return f.t < f.parryAct
        ? { glyph: "受", tone: "parry", ring: 1, arrow: arrowDirOf(f.idir) }
        : { glyph: "避", tone: "dodge", ring: clamp01(f.stam / 100), arrow: arrowDirOf(f.idir) };
    case "lunge":
      return { glyph: "！", tone: f.special ? "special" : "grab", ring: 1, arrow: null };
    case "parry":
      return f.t < f.parryAct ? { glyph: "受", tone: "parry", ring: 1, arrow: null } : null;
    case "stance":
      return { glyph: "構", tone: "special", ring: 1 - ratioOf(f.t, f.dur), arrow: null };
    case "stagger":
      return { glyph: "崩", tone: "down", ring: 1 - ratioOf(f.t, f.dur), arrow: null };
    default:
      return null;
  }
}

// ---- 守りの扇 ----

/** idle=待機 / warn=相手の突きの予告 / hold=指を置いている / parry=置いていて、パリィ受付中か予告と方向が合っている */
export type FanState = "idle" | "warn" | "hold" | "parry";

export function fanStateOf(player: Fighter, dir: SideDir, warnDir: SideDir | null): FanState {
  const isHeld = player.state === "inashi" && toSideDir(player.idir) === dir;
  const isWarned = warnDir === dir;
  if (isHeld && (isWarned || player.t < player.parryAct)) return "parry";
  if (isHeld) return "hold";
  return isWarned ? "warn" : "idle";
}

/** 相手の突きが来る側。番付が予告を出す設定のときだけ */
export function warnDirOf(game: Game, opponent: Fighter): SideDir | null {
  return game.diff.guide && opponent.state === "windup" && opponent.move === "tsuki" ? toSideDir(opponent.dir7) : null;
}

export interface FanGeometry {
  centerX: number;
  centerY: number;
  radius: number;
}

const FAN_INNER_RADIUS = 34;
const FAN_GAP_DEG = 1.5;
/** 扇の角度（度。0=画面の右、反時計回り）。試作の WEDGES と同じ */
const FAN_WEDGES: Record<SideDir, { from: number; to: number; labelAt: number }> = {
  [DIR_RIGHT]: { from: -15, to: 90, labelAt: 38 },
  [DIR_LEFT]: { from: 90, to: 195, labelAt: 142 },
};

/** 基準点は画面下の中央に固定する。指の位置を体で覚えられるよう、力士の位置には追従させない */
export function fanGeometry(width: number, height: number): FanGeometry {
  return {
    centerX: Math.round(width / 2),
    centerY: Math.round(Math.min(height * 0.8, height - 150)),
    radius: Math.round(Math.min(width * 0.46, height * 0.3)),
  };
}

const polar = (g: FanGeometry, radius: number, degrees: number): [number, number] => {
  const radians = (degrees * Math.PI) / 180;
  return [g.centerX + radius * Math.cos(radians), g.centerY - radius * Math.sin(radians)];
};
const fixed = ([x, y]: [number, number]): string => `${x.toFixed(1)},${y.toFixed(1)}`;

/** 扇1枚の SVG パス（内側の円弧と外側の円弧の間） */
export function fanPath(g: FanGeometry, dir: SideDir): string {
  const wedge = FAN_WEDGES[dir];
  const from = wedge.from + FAN_GAP_DEG;
  const to = wedge.to - FAN_GAP_DEG;
  const inner = FAN_INNER_RADIUS;
  return [
    `M${fixed(polar(g, inner, from))}`,
    `L${fixed(polar(g, g.radius, from))}`,
    `A${g.radius},${g.radius} 0 0 0 ${fixed(polar(g, g.radius, to))}`,
    `L${fixed(polar(g, inner, to))}`,
    `A${inner},${inner} 0 0 1 ${fixed(polar(g, inner, from))}Z`,
  ].join(" ");
}

export function fanLabelPoint(g: FanGeometry, dir: SideDir): { x: number; y: number } {
  const [x, y] = polar(g, g.radius - 18, FAN_WEDGES[dir].labelAt);
  return { x, y };
}

// ---- 熱 ----

/** 熱の残り時間の割合。熱でなければ 0 */
export const heatRatio = (f: Fighter): number => clamp01(f.hot / CFG.hot.dur);

// ---- がっぷり ----

export interface ClinchHud {
  east: number;
  west: number;
}

export function clinchHudOf(game: Game): ClinchHud | null {
  return game.clinch ? { east: Math.floor(game.clinch.taps[0]), west: Math.floor(game.clinch.taps[1]) } : null;
}

// ---- 決着画面 ----

export interface ResultStats {
  /** 取組時間(秒)。小数1桁 */
  seconds: string;
  /** 押した回数 */
  hits: number;
  /** パリィ（弾いた回数 + 受け止めた回数）。試作と同じ数え方 */
  parries: number;
}

export function resultStatsOf(game: Game, playerSide: Side): ResultStats {
  const player = game.f[playerSide];
  return { seconds: (game.t / 1000).toFixed(1), hits: player.hits, parries: player.parries + player.blocks };
}
