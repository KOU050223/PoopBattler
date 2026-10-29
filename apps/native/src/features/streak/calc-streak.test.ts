import { describe, expect, it } from "vitest";
import { calcStreak } from "./calc-streak";

// ローカル時間で組み立てる（境界が端末のローカル日付であることを検証するため）。
const at = (month: number, day: number, hour = 12, minute = 0) => new Date(2026, month - 1, day, hour, minute);
const now = at(10, 29, 15);

describe("calcStreak", () => {
  it("記録がないと連続0・今日0回", () => {
    expect(calcStreak([], now)).toEqual({ streakDays: 0, todayCount: 0 });
  });

  it("今日だけ記録があると連続1", () => {
    expect(calcStreak([at(10, 29, 8)], now).streakDays).toBe(1);
  });

  it("昨日まで3日連続で今日なしなら連続3のまま", () => {
    const result = calcStreak([at(10, 28), at(10, 27), at(10, 26)], now);
    expect(result).toEqual({ streakDays: 3, todayCount: 0 });
  });

  it("1日空くと途切れる", () => {
    expect(calcStreak([at(10, 29), at(10, 27), at(10, 26)], now).streakDays).toBe(1);
  });

  it("昨日も今日も無ければ0", () => {
    expect(calcStreak([at(10, 27), at(10, 26)], now).streakDays).toBe(0);
  });

  it("同じ日に複数回あっても1日として数える", () => {
    const result = calcStreak([at(10, 29, 7), at(10, 29, 12), at(10, 28, 9), at(10, 28, 21)], now);
    expect(result.streakDays).toBe(2);
  });

  it("23:59 と翌日 0:01 は別の日として連続2になる", () => {
    const result = calcStreak([at(10, 28, 23, 59), at(10, 29, 0, 1)], now);
    expect(result.streakDays).toBe(2);
  });

  it("月をまたいでも連続を数える", () => {
    expect(calcStreak([at(10, 31), at(11, 1), at(11, 2)], at(11, 2)).streakDays).toBe(3);
  });

  it("きょうの回数は今日の記録だけを数える", () => {
    const result = calcStreak([at(10, 29, 0, 1), at(10, 29, 9), at(10, 29, 18), at(10, 28, 23, 59)], now);
    expect(result.todayCount).toBe(3);
  });

  it("ISO文字列も受け取れる", () => {
    const result = calcStreak([at(10, 29, 9).toISOString()], now);
    expect(result).toEqual({ streakDays: 1, todayCount: 1 });
  });
});
