const WEEKDAY_LABELS = {
  mon: "月曜日",
  tue: "火曜日",
  wed: "水曜日",
  thu: "木曜日",
  fri: "金曜日",
  sat: "土曜日",
  sun: "日曜日",
} as const;

/** 図の軸に使う1文字表記。7本並ぶ棒グラフに「月曜日」は入らない。 */
const WEEKDAY_SHORT_LABELS = {
  mon: "月",
  tue: "火",
  wed: "水",
  thu: "木",
  fri: "金",
  sat: "土",
  sun: "日",
} as const;

export type Weekday = keyof typeof WEEKDAY_LABELS;

/**
 * うんちの色。記録した色そのもので帯を塗る。
 *
 * ブランドのピンクで塗ると「茶色が多い週」と「緑が多い週」が同じ絵になる。
 * 色は意味を持つ軸なので、ここだけはテーマ色を使わない。
 */
export const BOWEL_COLOR_LABELS = {
  brown: { label: "茶色", hex: "#a9743f" },
  dark_brown: { label: "こげ茶", hex: "#6d4522" },
  yellow: { label: "黄色", hex: "#e0b23c" },
  green: { label: "緑", hex: "#7fa658" },
} as const;

export type BowelColor = keyof typeof BOWEL_COLOR_LABELS;

export function weekdayLabel(value: Weekday) {
  return WEEKDAY_LABELS[value];
}

export function weekdayShortLabel(value: Weekday) {
  return WEEKDAY_SHORT_LABELS[value];
}
