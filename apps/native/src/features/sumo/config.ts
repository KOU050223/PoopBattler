// 数値の正本は docs/battle.md（試作と食い違う箇所は試作どおり。DIFFS.md 参照）
import type { Difficulty, FavoriteMove, Mode, Species } from "./types";

export const SPECIES: readonly Species[] = [
  {
    id: "curry",
    kind: "カレーうんちくん",
    shikona: "華麗山",
    fav: "tsuki",
    mass: 1.0,
    power: 1.2,
    grit: 0.9,
    special: {
      id: "busou",
      name: "激辛ぶちかまし",
      desc: "必殺：激辛ぶちかまし。出の速い突き。いなしでは避けられない（方向が合ったパリィなら弾ける）。押し×2.2",
    },
  },
  {
    id: "banana",
    kind: "バナナうんちくん",
    shikona: "甘蕉海",
    fav: "parry",
    mass: 1.0,
    power: 1.1,
    grit: 1.3,
    special: {
      id: "suberi",
      name: "皮すべらせ",
      desc: "必殺：皮すべらせ。1.2秒の構え。突きも四つも受け流して大きく押し返す",
    },
  },
  {
    id: "ganko",
    kind: "ガンコうんちくん",
    shikona: "頑固岩",
    fav: "grab",
    mass: 1.2,
    power: 1.0,
    grit: 1.0,
    special: {
      id: "gaburi",
      name: "カチカチがぶり寄り",
      desc: "必殺：カチカチがぶり寄り。突きで潰されない四つ。押し×1.7",
    },
  },
];

export const FAVORITE_NAMES: Record<FavoriteMove, string> = { tsuki: "突き押し", grab: "四つ", parry: "パリィ" };

/** 時間はすべて ms */
export const CFG = {
  tsuki: { act: 110, rec: 300, cost: 14 },
  grab: { min: 520, max: 1100, lunge: 200, act: 150, rec: 380, cost: 22, push: 26, catchPush: 40 },
  dodge: { act: 260, actEdge: 400, tot: 620, cost: 12 },
  parry: { act: 240, tot: 560, cost: 10, stag: 850, drain: 22, refund: 10, gauge: 35, knock: 10 },
  inashi: { drain: 4, stag: 600 },
  // [構え(ms), 押す量]。使うのは 0=画面の右 / 6=画面の左。3=上 は遅くて重い（既定値）
  dirSpec: [
    [430, 16],
    [410, 18],
    [450, 21],
    [480, 24],
    [450, 21],
    [410, 18],
    [430, 16],
  ] as const,
  riposteWind: 200,
  riposteT: 1100,
  riposteMult: 1.5,
  hot: { dur: 2500, wind: 240, grabMin: 340, mult: 1.15 },
  counter: 20,
  stagHit: 380,
  stagParried: 650,
  stagGrab: 480,
  regen: 26,
  regenBusy: 6,
  EDGE: 72,
  OUT: 130,
  repDecay: 0.6,
} as const;

/** 序盤は時間がゆっくり流れ、パリィの受付が広く、必殺・熱・連続同手の弱体化がない */
export const MODE_EARLY: Mode = {
  id: "early",
  name: "序盤",
  timeScale: 0.72,
  parryAct: 340,
  push: 1.6,
  hasSpecial: false,
  hasHot: false,
  hasRepeatPenalty: false,
};

export const MODE_FULL: Mode = {
  id: "full",
  name: "本気",
  timeScale: 1,
  parryAct: null,
  push: 1,
  hasSpecial: true,
  hasHot: true,
  hasRepeatPenalty: true,
};

export const MODES: readonly Mode[] = [MODE_EARLY, MODE_FULL];

export const DIFFICULTIES: readonly Difficulty[] = [
  { id: "jonokuchi", name: "序ノ口", react: 440, read: 0.35, aggr: 0.75, mash: 5, guide: true },
  { id: "makushita", name: "幕下", react: 320, read: 0.55, aggr: 1, mash: 7, guide: true },
  { id: "yokozuna", name: "横綱", react: 240, read: 0.78, aggr: 1.25, mash: 9.5, guide: false },
];

export const [DIFF_JONOKUCHI, DIFF_MAKUSHITA, DIFF_YOKOZUNA] = DIFFICULTIES as [Difficulty, Difficulty, Difficulty];
