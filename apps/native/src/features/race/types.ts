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
