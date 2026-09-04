/**
 * ぼかし表示のためのダミー分析値を作る。
 *
 * 実データにCSSのぼかしを掛ける形にしない。ぼかしは見た目だけの加工なので、
 * DevToolsでスタイルを1行消せば全部読めるうえ、そもそもRSCペイロードに
 * 実値が載る。ここで作るのは「レポートの形をした無意味な数字」であり、
 * 非課金ユーザーのブラウザに本物の分析値を送らないための実装。
 *
 * シードを固定するのは、再レンダリングのたびに数字が踊るとチープに見えるため。
 */

/** 32bit の決定的な擬似乱数列（mulberry32）。 */
function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type TeaserPlaceholder = {
  /** ハイライトの4指標。表示用の文字列まで作る。 */
  metrics: Array<{ value: string; detail: string }>;
  /** 硬さの分布。棒グラフの高さ（%）。 */
  hardnessHeights: number[];
  /** 量・出やすさの内訳（3値ずつ）。 */
  amount: number[];
  ease: number[];
  /** 日別の記録数。 */
  dailyCounts: number[];
  /** 4週間の推移（回数と平均の硬さ）。 */
  fourWeekTrend: Array<{ count: number; average: string }>;
  /** 食品群別分析の行数ぶんのダミー値。 */
  mealFoodGroups: Array<{ mealCount: number; within24: number; within48: number }>;
};

/**
 * 件数をシードにダミー値を作る。
 *
 * 件数自体は無料枠として既に表示している値なので、これがシードに漏れても
 * 新しく渡る情報は無い。
 */
export function createTeaserPlaceholder(seed: number): TeaserPlaceholder {
  const random = createRandom(seed * 2654435761 + 1);
  const between = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));

  return {
    metrics: [
      { value: `${between(5, 14)}回`, detail: `先週比 +${between(1, 4)}回` },
      { value: `${between(3, 7)}日`, detail: "今週の記録" },
      { value: (between(25, 52) / 10).toFixed(1), detail: "1から7の記録" },
      { value: `${between(45, 92)}%`, detail: "今週の記録" },
    ],
    hardnessHeights: Array.from({ length: 7 }, () => between(12, 100)),
    amount: Array.from({ length: 3 }, () => between(1, 9)),
    ease: Array.from({ length: 3 }, () => between(1, 9)),
    dailyCounts: Array.from({ length: 5 }, () => between(0, 4)),
    fourWeekTrend: Array.from({ length: 4 }, () => ({
      count: between(4, 15),
      average: (between(25, 52) / 10).toFixed(1),
    })),
    mealFoodGroups: Array.from({ length: 3 }, () => ({
      mealCount: between(5, 18),
      within24: between(3, 11),
      within48: between(4, 16),
    })),
  };
}
