/** 0 = 東（＋方向へ押す）、1 = 西（−方向へ押す） */
export type Side = 0 | 1;

export type FavoriteMove = "tsuki" | "grab" | "parry";
export type SpecialId = "busou" | "suberi" | "gaburi";

/** 手の種類。突きの方向は 0=画面の右 / 6=画面の左（3=上は未使用の既定値） */
export type ActKind = "tsuki" | "grab" | "parry" | "inashi" | "dodge" | "special" | "grabRelease" | "inashiEnd";

/** inashi は {dir,dur}、tsuki/parry/dodge は方向の数値 */
export type ActArg = number | { dir?: number; dur?: number } | undefined;

export type FighterState =
  | "idle"
  | "windup"
  | "lunge"
  | "active"
  | "recover"
  | "stagger"
  | "inashi"
  | "parry"
  | "dodge"
  | "stance"
  | "clinch";

export type HitType = "tsuki" | "grab" | "catch";

export interface Species {
  id: string;
  kind: string;
  shikona: string;
  fav: FavoriteMove;
  /** 体格: 受ける押しを割る */
  mass: number;
  /** 押す力 */
  power: number;
  /** 粘り: 土俵際でだけ受ける押しを割る */
  grit: number;
  special: { id: SpecialId; name: string; desc: string };
}

export interface Mode {
  id: "early" | "full";
  name: string;
  /** ロジックへ渡す経過時間に掛ける倍率 */
  timeScale: number;
  /** パリィ受付(ms)。null なら CFG.parry.act */
  parryAct: number | null;
  /** 一押しの倍率 */
  push: number;
  hasSpecial: boolean;
  hasHot: boolean;
  /** 同じ手の連続で弱くなる仕組み */
  hasRepeatPenalty: boolean;
}

export interface Difficulty {
  id: string;
  name: string;
  /** 相手の構えに気づくまで(ms) */
  react: number;
  /** 読みが当たる確率 */
  read: number;
  /** 攻める頻度の倍率 */
  aggr: number;
  /** がっぷり連打/秒 */
  mash: number;
  /** UIの扇の予告を出すか（ロジックでは未使用） */
  guide: boolean;
  /** 読めなかったとき固まる確率 */
  freeze?: number;
  punish?: number;
  /** false なら熱の間の畳みかけが遅い */
  rush?: boolean;
  gap?: number;
}

export interface Fighter {
  side: Side;
  sp: Species;
  /** 押す向き(+1 / -1) */
  dir: 1 | -1;
  state: FighterState;
  t: number;
  dur: number;
  move: "tsuki" | "grab" | "parry" | "dodge" | "inashi" | "stance" | "clinch" | null;
  stam: number;
  gauge: number;
  last: string | null;
  run: number;
  repMult: number;
  release: boolean;
  charge: number;
  windId: number;
  dodgeAct: number;
  dodgeDir: number;
  special: boolean;
  armor: boolean;
  spMult: number;
  unparryable: boolean;
  buffer: { kind: ActKind; arg: ActArg } | null;
  idleT: number;
  pspam: number;
  pspamT: number;
  hot: number;
  hits: number;
  parries: number;
  blocks: number;
  guards: number;
  /** いなしで構えた方向 */
  idir: number;
  riposte: number;
  parryAct: number;
  dir7: number;
  pdir: number;
  pushBase: number;
  autoRelease: number;
  ripHit: boolean;
}

export interface Ai {
  lungeParry: number;
  parryAt: number;
  parryDir: number;
  next: number;
  seen: string;
  reactAt: number;
  reactFor: Fighter["move"];
  willRead: boolean;
  feintAt: number;
  releaseAt: number;
  mashAcc: number;
}

export interface Clinch {
  t: number;
  dur: number;
  taps: [number, number];
  /** 見た目だけ寄る量 */
  lean: number;
}

export type TextKind = "special" | "riposte" | "aiuchi";

/** ロジックから描画・音・UIへの通知。力士は Side で渡す */
export type SumoEvent =
  | { type: "hit"; attacker: Side; defender: Side; hitType: HitType; push: number }
  | { type: "block"; defender: Side; attacker: Side; isEdge: boolean; push: number }
  | { type: "parry"; defender: Side; attacker: Side; isEdge: boolean; isStance: boolean; push: number }
  | { type: "clinch"; isStart: boolean }
  | { type: "clinchWin"; winner: Side | null; loser: Side | null; push: number; tapDiff: number }
  | { type: "hot"; side: Side }
  | { type: "end"; winner: Side }
  | { type: "text"; side: Side; text: TextKind }
  | { type: "gas"; side: Side }
  | { type: "wind"; side: Side; move: "tsuki" | "grab" }
  | { type: "lunge"; side: Side }
  | { type: "rep"; side: Side; mult: number };

export interface Game {
  pos: number;
  target: number;
  /** 取組の経過(ms, ロジック時間) */
  t: number;
  phase: "fight" | "end";
  f: [Fighter, Fighter];
  diff: Difficulty;
  /** 東西で番付を変えたいとき */
  diffs?: [Difficulty, Difficulty];
  mode: Mode;
  rand: () => number;
  emit: (event: SumoEvent) => void;
  clinch: Clinch | null;
  winner: Side | null;
  /** 決まり手 */
  km: string;
  lastKm: string;
  /** ヒットストップの残り(ms)。UIが立てる */
  freeze: number;
  ai: [Ai, Ai];
  /** NPC が操作する側 */
  npc: [boolean, boolean];
}
