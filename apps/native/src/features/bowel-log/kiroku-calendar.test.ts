import { describe, expect, it } from "vitest";

import type { BattleHistoryLog } from "./battle-history-gateway";
import { buildMonthGrid, loggedDaysInMonth, pickRecentLogs, toDayLabel } from "./kiroku-calendar";

const bowelLog = { hardness: 4, amount: "normal", color: "brown", ease: "easy" } as const;
const log = (battleId: string, completedAt: string, withBowel = true): BattleHistoryLog => ({
  battleId,
  completedAt,
  companionshipResult: false,
  mealFoodGroups: null,
  enemy: { id: "e", name: "e", attribute: "meat" },
  bowelLog: withBowel ? bowelLog : null,
});

describe("buildMonthGrid", () => {
  it("2026年10月は木曜はじまりで、1日の前に日〜水の4マスが空く", () => {
    const grid = buildMonthGrid(2026, 9);
    expect(grid[0]).toEqual([null, null, null, null, 1, 2, 3]);
  });

  it("最後の週は月末のあとを空きマスで埋めて、どの週も7マスになる", () => {
    const grid = buildMonthGrid(2026, 9);
    expect(grid.every((week) => week.length === 7)).toBe(true);
    expect(grid[grid.length - 1]).toEqual([25, 26, 27, 28, 29, 30, 31]);
  });

  it("日曜はじまりの月は先頭に空きがない（2026年2月）", () => {
    const grid = buildMonthGrid(2026, 1);
    expect(grid[0][0]).toBe(1);
    expect(grid).toHaveLength(4);
  });

  it("うるう年の2月は29日まで並ぶ", () => {
    expect(buildMonthGrid(2028, 1).flat().filter((day) => day !== null)).toHaveLength(29);
  });
});

describe("loggedDaysInMonth", () => {
  it("bowelLog がある日だけ、対象の月から拾う", () => {
    const days = loggedDaysInMonth(
      [log("a", new Date(2026, 9, 3, 7).toISOString()), log("b", new Date(2026, 9, 4, 7).toISOString(), false), log("c", new Date(2026, 8, 30, 7).toISOString())],
      2026,
      9,
    );
    expect([...days]).toEqual([3]);
  });

  it("同じ日に2回あっても1日として数える", () => {
    const days = loggedDaysInMonth([log("a", new Date(2026, 9, 3, 7).toISOString()), log("b", new Date(2026, 9, 3, 20).toISOString())], 2026, 9);
    expect(days.size).toBe(1);
  });

  it("ローカル時間の深夜0時台は、その日として数える", () => {
    expect(loggedDaysInMonth([log("a", new Date(2026, 9, 5, 0, 10).toISOString())], 2026, 9).has(5)).toBe(true);
  });

  it("不正な日付は無視する", () => {
    expect(loggedDaysInMonth([log("a", "not-a-date")], 2026, 9).size).toBe(0);
  });
});

describe("pickRecentLogs", () => {
  it("記録のないものを除き、新しい順に limit 件にする", () => {
    const logs = [
      log("old", new Date(2026, 9, 1, 7).toISOString()),
      log("none", new Date(2026, 9, 5, 7).toISOString(), false),
      log("new", new Date(2026, 9, 3, 7).toISOString()),
      log("mid", new Date(2026, 9, 2, 7).toISOString()),
    ];
    expect(pickRecentLogs(logs, 2).map((entry) => entry.battleId)).toEqual(["new", "mid"]);
  });
});

describe("toDayLabel", () => {
  const now = new Date(2026, 9, 28, 12, 0);

  it("同じ日は today、時刻は分を2桁にする", () => {
    expect(toDayLabel(new Date(2026, 9, 28, 7, 5).toISOString(), now)).toMatchObject({ kind: "today", time: "7:05" });
  });

  it("前の日は yesterday", () => {
    expect(toDayLabel(new Date(2026, 9, 27, 23, 59).toISOString(), now).kind).toBe("yesterday");
  });

  it("それより前は月日つきの date", () => {
    expect(toDayLabel(new Date(2026, 9, 20, 7, 0).toISOString(), now)).toMatchObject({ kind: "date", month: 10, day: 20 });
  });
});
