export type WeekSummary = { count: number; days: number };

/** loading・失敗は null。0 回と誤表示しないため、まとめごと出さない。 */
export type WeekSummaryState =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "ready"; summary: WeekSummary };

export function weekSummaryToShow(state: WeekSummaryState): WeekSummary | null {
  return state.status === "ready" ? state.summary : null;
}
