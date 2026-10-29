/** 見るだけの区間の地形（試作の sta / pow / tec に対応。効くステータスは config の TERRAIN_STAT） */
export type Terrain = "straight" | "uphill" | "snake";

/** ミニゲーム4種（試作の mash / timing / balance / swipe） */
export type MiniGame = "dash" | "hurdle" | "bridge" | "swipe";

export type SectionKind = "start" | "watch" | "zone";

export type StatKey = "stamina" | "power" | "technique";

export interface RunnerStats {
  stamina: number;
  power: number;
  technique: number;
}

/** 中心線の1m間隔の点（race.md 2章） */
export interface CoursePoint {
  x: number;
  z: number;
  /** 高さ */
  y: number;
  /** 向き（rad）。この点の曲率 k まで含めた累積 */
  h: number;
  /** 1m あたりの向きの変化 */
  k: number;
  /** 道幅 */
  w: number;
  /** 距離（= 点の番号） */
  s: number;
  kind: SectionKind;
  /** kind が zone の点だけ */
  zone?: MiniGame;
  /** kind が zone の点だけ。何番目のミニゲームか */
  zoneIndex?: number;
  /** kind が watch の点だけ */
  terrain?: Terrain;
}

export interface CourseSection {
  kind: SectionKind;
  startS: number;
  length: number;
  zone?: MiniGame;
  zoneIndex?: number;
  terrain?: Terrain;
}

export interface Hurdle {
  s: number;
  zoneIndex: number;
}

export interface Course {
  points: CoursePoint[];
  /** コースの並び順（スタート → 見るだけ → ミニゲーム … → 見るだけ） */
  sections: CourseSection[];
  hurdles: Hurdle[];
  finishS: number;
}

/** ステータスから決まる物理（race.md 3.1） */
export interface RunnerPhysics {
  topSta: number;
  topPow: number;
  accel: number;
  grip: number;
  turn: number;
  slide: number;
  mass: number;
  power: number;
}

/** 走者の状態。0 番がプレイヤー */
export interface Runner {
  index: number;
  isPlayer: boolean;
  stats: RunnerStats;
  physics: RunnerPhysics;
  x: number;
  z: number;
  vx: number;
  vz: number;
  /** 向き（rad） */
  h: number;
  /** 路面の高さ */
  y: number;
  /** 一番近い中心線の点の番号 */
  trackIndex: number;
  /** コース上の距離 */
  s: number;
  /** 中心線からの横位置（左が負） */
  lat: number;
  laneBase: number;
  /** 追い抜き中の相手の番号 */
  passingIndex: number | null;
  passLat: number;
  isDrafting: boolean;
  /** ゴールしたシミュレーション時間 */
  finishedAt: number | null;
  /** 調子の波の位相 */
  formPhase: number;
  /** いるミニゲーム区間の番号。区間の外は -1 */
  zoneIndex: number;
  /** 今のミニゲーム区間での出来（0〜1） */
  perf: number;
  stumbleUntil: number;
  boostUntil: number;
  jumpUntil: number;
  /** 通過済みのハードル（Course.hurdles の番号） */
  doneHurdles: number[];
  /** つり橋で自分の横位置を針に合わせるとき、針の位置（-1〜1）。普段は null */
  bridgeNeedle: number | null;
  isAheadOfPlayer: boolean;
}

export type RaceEvent =
  | { type: "bump"; runners: [number, number]; impulse: number; x: number; y: number; z: number }
  | { type: "finish"; runner: number; place: number; time: number }
  | { type: "zoneEnter"; runner: number; zoneIndex: number }
  | { type: "zoneExit"; runner: number; zoneIndex: number }
  | { type: "jump"; runner: number }
  | { type: "stumble"; runner: number }
  | { type: "draftStart"; runner: number }
  | { type: "rankChange"; from: number; to: number }
  | { type: "leaderChange"; runner: number };

/** 外から走者へ入れる指示。ミニゲーム（I255-03）がこれで perf・ジャンプ・転倒などを伝える */
export type RaceCommand =
  | { type: "setPerf"; runner: number; perf: number }
  | { type: "jump"; runner: number }
  | { type: "stumble"; runner: number }
  | { type: "boost"; runner: number; durationSec: number }
  /** 転倒と同じ減速だけをかける。stumble イベントは出さない（S字の外し。試作は stumbleUntil だけ書き換える） */
  | { type: "slow"; runner: number; durationSec: number }
  | { type: "setBridgeNeedle"; runner: number; needle: number | null };

export interface Race {
  course: Course;
  rng: () => number;
  /** シミュレーション時間（秒） */
  time: number;
  runners: Runner[];
  collisions: boolean;
  fixedPerf: number | null;
  /** 走者の番号を順位順に並べたもの */
  order: number[];
  /** 自分の順位（1始まり） */
  playerRank: number;
  leaderIndex: number;
  /** 全員がゴールした */
  isFinished: boolean;
}

// ---- ミニゲーム（I255-03） ----

export type Grade = "S" | "A" | "B" | "C";

/** miss は跳ばずに通り過ぎた。tooEarly は 3.4m より手前、または 0.6m より奥の踏み切り（試作は同じ扱い） */
export type HurdleJudge = "perfect" | "good" | "tooEarly" | "miss";

export type ArrowJudge = "fast" | "slow" | "miss";

/** 自分のミニゲームで起きたこと。UI が再生するだけの形 */
export type MinigameEvent =
  | { type: "begin"; zone: MiniGame; zoneIndex: number }
  /** 連打の「＋」を散らす合図 */
  | { type: "dashTap" }
  | { type: "dashAllOut" }
  | { type: "hurdleResult"; judge: HurdleJudge; perf: number }
  | { type: "arrowResult"; arrowIndex: number; judge: ArrowJudge; perf: number }
  | { type: "end"; zone: MiniGame; zoneIndex: number; grade: Grade; average: number };

// ---- 実況・表示の出来事（I255-03） ----

/** 実況の優先度。大きいほど強い（ロック中に割り込めるのは今より低くないものだけ） */
export type SayPriority = 1 | 2 | 3;

export type Presentation =
  | { type: "say"; text: string; priority: SayPriority }
  /** 画面中央の大きな文字。isBad は暗い色（ミス・後退） */
  | { type: "bigText"; text: string; isBad: boolean }
  | { type: "focusLines"; on: boolean }
  | { type: "cinema"; on: boolean }
  | { type: "cutIn"; name: string; line: string }
  | { type: "photoFinish" };
