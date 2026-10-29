import { describe, expect, it } from "vitest";
import { countdownLabel, hasHitTimeLimit, isCountdown, RACE_TIME_LIMIT_MS } from "./race-screen-timing";

describe("hasHitTimeLimit", () => {
  it("上限の1ms前はまだ結果へ移らない", () => {
    expect(hasHitTimeLimit(RACE_TIME_LIMIT_MS - 1)).toBe(false);
  });

  it("ちょうど上限で結果へ移る", () => {
    expect(hasHitTimeLimit(RACE_TIME_LIMIT_MS)).toBe(true);
  });

  it("上限は90秒", () => {
    expect(RACE_TIME_LIMIT_MS).toBe(90_000);
  });
});

describe("countdownLabel", () => {
  it("開始直後は3、1秒ごとに2・1と減る", () => {
    expect([0, 999, 1000, 2000, 2999].map(countdownLabel)).toEqual(["3", "3", "2", "1", "1"]);
  });

  it("3秒ちょうどで「スタート！」になり、少し経つと何も出さない", () => {
    expect([3000, 3500, 3600, 10_000].map(countdownLabel)).toEqual(["スタート！", "スタート！", null, null]);
  });

  it("負の経過時間（時計のずれ）では何も出さない", () => {
    expect(countdownLabel(-1)).toBeNull();
  });
});

describe("isCountdown", () => {
  it("3秒の手前まではカウントダウン、3秒からはレース", () => {
    expect([isCountdown(2999), isCountdown(3000)]).toEqual([true, false]);
  });
});
