// 数値の正本は docs/race.md（試作と食い違う箇所は試作どおり。DIFFS.md 参照）
import type { MiniGame, StatKey, Terrain } from "./types";

// ---- 2章 コース ----
export const COURSE = {
  roadWidth: 11,
  bridgeWidth: 6.5,
  bridgeHeight: 1.3,
  /** つり橋の入口・出口でなだらかにつなぐ長さ */
  bridgeRampLength: 6,
  startLength: 32,
  startLineS: 18,
  zoneLength: 48,
  zonesPerRace: 3,
  /** 見るだけの区間の長さ。坂とS字の周期の倍数にして、区間の終わりで段差や向きのずれを出さない */
  watchLengths: [90, 150, 150] as readonly number[],
  finalWatchLength: 150,
  /** ゴールは終端のこの手前 */
  finishBeforeEnd: 20,
  terrainWaveLength: 30,
  hillHeight: 3.2,
  /** 見るだけのS字の向きの振れ幅 */
  snakeAmplitude: 0.8,
  /** ミニゲームS字の向きの振れ幅と周期 */
  swipeAmplitude: 0.7,
  swipeWaveLength: 24,
  /** ハードルの位置（区間の長さに対する割合） */
  hurdleRatios: [0.3, 0.58, 0.86] as readonly number[],
} as const;

export const TERRAINS: readonly Terrain[] = ["straight", "uphill", "snake"];
export const MINI_GAMES: readonly MiniGame[] = ["dash", "hurdle", "bridge", "swipe"];

/** 3.1 地形がどのステータスに効くか（どのステータスも2か所ずつ効く） */
export const TERRAIN_STAT: Record<Terrain, StatKey> = { straight: "stamina", uphill: "power", snake: "technique" };

// ---- 3章 ステータスと物理 ----
export const RUNNER_COUNT = 8;
export const RUNNER_RADIUS = 0.75;
export const OPPONENT_STAT_SHAPES: readonly (readonly [number, number, number])[] = [
  [8, 4, 3], [9, 3, 3], [5, 5, 5], [7, 7, 1], [6, 6, 3], [7, 5, 3], [6, 5, 4],
];

export const PHYSICS = {
  topSpeed: 15,
  topSpeedBase: 12,
  topSpeedPerStat: 0.8,
  accelBase: 4.5,
  accelPerPower: 0.7,
  decel: 9,
  uphillSlopeBase: 1.6,
  uphillSlopePerPower: 0.13,
  uphillMin: 0.35,
  downhillBonus: 0.4,
  gripBase: 10,
  gripPerTechnique: 1.15,
  /** この曲率を超えたらカーブ速度で頭打ちにする */
  curveThreshold: 0.02,
  curveLookahead: 14,
  // turn と slide の係数を小さくしてあるのは調整の結果（技術が低い子が壁に当たり続けるため。race.md 3.1）
  turnBase: 2.3,
  turnPerTechnique: 0.06,
  slideBase: 4.2,
  slidePerTechnique: 0.2,
  massBase: 1,
  massPerPower: 0.12,
  formSwing: 0.03,
  formFrequency: 0.35,
  stumbleDuration: 0.7,
  stumbleFactor: 0.45,
  boostFactor: 1.2,
  finishedSpeed: 4,
  /** 操舵 */
  lookaheadBase: 5,
  lookaheadPerSpeed: 0.35,
  lookaheadMin: 5,
  lookaheadMax: 14,
  laneOffsets: [-4.2, -3, -1.8, -0.6, 0.6, 1.8, 3, 4.2] as readonly number[],
  /** 勾配は前後この距離の高さの差から出す */
  gradeSpan: 2,
  /** 狙うレーンを、壁からこの距離より内側に収める */
  roadEdgeMargin: 0.9,
  /** レーンが道の内側の限界をはみ出してよい量 */
  laneSlack: 0.5,
  /** コースの終端に着いたあとの減速（毎ステップの倍率） */
  courseEndDamping: 0.9,
  /** 走者の現在地を探す範囲（前回の点からの前後の点数） */
  trackSearchBehind: 4,
  trackSearchAhead: 30,
} as const;

/** スタートの2列グリッド（race.md 2章）。後列に自分、前列は相手 */
export const GRID = {
  rowsS: [8, 12] as readonly number[],
  laterals: [-3.6, -1.2, 1.2, 3.6] as readonly number[],
  /** 後列の枠の数。自分はこのどれかに入る */
  rearSlots: 4,
} as const;

// ---- 4章 ぶつかり合いと追い抜き ----
export const COLLISION = {
  restitution: 0.55,
  rearEndRestitution: 0.05,
  rearEndDot: 0.75,
  rearEndSideSpeed: 1.5,
  wallBounce: 1.45,
  wallDamping: 0.96,
  bumpImpulse: 2.2,
  /** 壁に当たる位置（半径に対する割合。少しめり込むまで許す） */
  wallRadiusRatio: 0.9,
  /** ぶつかったときの向きの崩れ方の係数 */
  turnDisturbance: 0.04,
} as const;

export const DRAFT = { minGap: 0.8, maxGap: 7, maxLateral: 1.3, boost: 0.09 } as const;

export const OVERTAKE = {
  lookAhead: 6,
  maxLateral: 1.5,
  speedMargin: 0.5,
  lineOffset: 1.8,
  clearAhead: 1.5,
  giveUpGap: 9,
  /** 相手の左右の候補のうち、これより相手に近くなる位置は捨てる */
  minLineGap: 1.4,
  /** 候補の位置に他の子がいるかを見る範囲（前後と横）と減点 */
  crowdRange: 6,
  crowdLateral: 1.5,
  crowdPenalty: 3,
  /** 今の横位置から遠い候補ほど下げる係数 */
  moveCost: 0.3,
} as const;

// ---- 5章 ミニゲーム ----
export const MINI_GAME = {
  perfStart: 0.5,
  perfStartDash: 0.3,
  announceAhead: 16,
  speedBase: 0.78,
  speedPerPerf: 0.44,
  oppPerfMean: 0.72,
  oppPerfSpread: 0.3,
  oppPerfMin: 0.25,
  oppPerfMax: 0.97,
} as const;

export const GRADES = [
  { min: 0.88, grade: "S" },
  { min: 0.68, grade: "A" },
  { min: 0.45, grade: "B" },
  { min: -Infinity, grade: "C" },
] as const;

export const DASH = { windowSec: 0.8, minRate: 2, rateRange: 7, followSpeed: 8, allOutPerf: 0.92 } as const;

export const HURDLE = {
  perfect: { min: 1.3, max: 2.2, perf: 1, boostSec: 0.6 },
  good: { min: 0.6, max: 3.4, perf: 0.65 },
  tooEarlyPerf: 0.1,
  missPerf: 0.1,
  /** これより遠いタップは誤タップとして無視する */
  ignoreBeyond: 8,
  slowAhead: 7,
  jumpSec: 0.5,
  jumpHeight: 1.3,
  oppJumpAhead: 2,
  oppSuccessRate: 0.82,
} as const;

export const BRIDGE = {
  safeHalfWidth: 0.25,
  holdAccel: 4.2,
  damping: 1.6,
  driftSlow: { freq: 1.7, amp: 0.9 },
  driftFast: { freq: 3.3, amp: 0.6 },
  driftBase: 1.3,
  driftGrowth: 0.5,
  edgeMargin: 0.4,
} as const;

export const SWIPE = {
  arrows: 4,
  minDistancePx: 28,
  limitSec: 0.8,
  fastSec: 0.45,
  fastPerf: 1,
  slowPerf: 0.7,
  missPerf: 0.1,
  correctBoostSec: 0.4,
  missSlowSec: 0.3,
} as const;

// ---- 6章 演出 ----
export const DIRECTOR = {
  photoFinishAhead: 10,
  photoFinishGap: 2.5,
  photoFinishCloseSec: 0.1,
  rankSwapGap: 0.6,
  finalSpurtAhead: 40,
  /** 実況のロック(ms)。優先度の高い発言だけが割り込める */
  sayLockMs: 1000,
  /** 大きな文字（順位変化・ゴツン！）を出す間隔(ms) */
  bigTextIntervalMs: 900,
  /** 自分以外のぶつかりの実況の間隔(ms) */
  bumpSayIntervalMs: 2000,
  draftSayIntervalMs: 3000,
  cutInMs: 1150,
  /** 集中線を出すミニゲームの出来 */
  focusLinesPerf: 0.85,
  /** 先頭がゴールのこの手前に来たらゴール前の演出（カメラ・集中線）。自分のゴール後 finishAfterSec まで */
  finishApproachAhead: 16,
  finishAfterSec: 2.5,
  /** 自分がゴールしてから、残りを待たずにレースを終えるまで(ms) */
  finishGraceMs: 4000,
} as const;
