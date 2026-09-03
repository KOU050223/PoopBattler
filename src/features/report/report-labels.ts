const WEEKDAY_LABELS = {
  mon: "月曜日",
  tue: "火曜日",
  wed: "水曜日",
  thu: "木曜日",
  fri: "金曜日",
  sat: "土曜日",
  sun: "日曜日",
} as const;

export type Weekday = keyof typeof WEEKDAY_LABELS;

export function weekdayLabel(value: Weekday) {
  return WEEKDAY_LABELS[value];
}
