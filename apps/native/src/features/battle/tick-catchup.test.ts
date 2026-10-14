import { describe, expect, it } from "vitest";

import { TICK_INTERVAL_MS } from "@poopbattler/domain/battle/battle.constants";
import { applyBattleStart, applyBattleTick } from "@poopbattler/domain/battle/battle-runtime";
import type { BattleSnapshot, BattleStartInput } from "@poopbattler/domain/battle/battle.types";

import { MAX_CATCHUP_TICKS, catchUpBattleTicks, foldBattleTicks, ticksForElapsed } from "./tick-catchup";

const member = { userCharacterId: null, characterId: "normal-poop", attribute: "normal", hp: 240, power: 20, speed: 20 } as const;
const input: BattleStartInput = {
  battleId: "battle-1",
  enemy: { characterId: "curry-poop", attribute: "curry", hp: 480, power: 26, speed: 20 },
  party: [member, member, member],
  now: 0,
};
const fresh = (): BattleSnapshot => applyBattleStart(input);

function repeat(state: BattleSnapshot, n: number) {
  let s = state;
  for (let i = 0; i < n; i += 1) s = applyBattleTick(s);
  return s;
}

describe("ticksForElapsed", () => {
  it("経過0・負・NaN は 0 tick", () => {
    expect(ticksForElapsed(0, 1)).toBe(0);
    expect(ticksForElapsed(-1000, 1)).toBe(0);
    expect(ticksForElapsed(Number.NaN, 1)).toBe(0);
  });

  it("1 tick 分ちょうどで 1、満たなければ 0", () => {
    expect(ticksForElapsed(TICK_INTERVAL_MS, 1)).toBe(1);
    expect(ticksForElapsed(TICK_INTERVAL_MS - 1, 1)).toBe(0);
  });

  it("倍速は間隔が半分", () => {
    expect(ticksForElapsed(TICK_INTERVAL_MS, 2)).toBe(2);
  });

  it("大量の経過時間は上限で打ち切る", () => {
    expect(ticksForElapsed(60 * 60 * 1000, 1)).toBe(MAX_CATCHUP_TICKS);
    expect(ticksForElapsed(60 * 60 * 1000, 1, 5)).toBe(5);
  });
});

describe("foldBattleTicks / catchUpBattleTicks", () => {
  it("0 tick は同じ状態をそのまま返す", () => {
    const s = fresh();
    expect(foldBattleTicks(s, 0)).toBe(s);
    expect(catchUpBattleTicks(s, 0, 1)).toBe(s);
  });

  it("1 tick は applyBattleTick 1回と等しい", () => {
    const s = fresh();
    expect(foldBattleTicks(s, 1)).toEqual(applyBattleTick(s));
    expect(foldBattleTicks(s, 1).elapsedTicks).toBe(1);
  });

  it("N tick は applyBattleTick の N 回繰り返しと完全に一致する", () => {
    const s = fresh();
    expect(foldBattleTicks(s, 25)).toEqual(repeat(s, 25));
    expect(catchUpBattleTicks(s, 25 * TICK_INTERVAL_MS, 1)).toEqual(repeat(s, 25));
  });

  it("大量の経過は上限 tick ぶんしか進まない", () => {
    const folded = catchUpBattleTicks(fresh(), 24 * 60 * 60 * 1000, 1);
    expect(folded.elapsedTicks).toBeLessThanOrEqual(MAX_CATCHUP_TICKS);
    expect(folded).toEqual(repeat(fresh(), MAX_CATCHUP_TICKS));
  });

  it("勝敗が付いたらそれ以上進めない", () => {
    const weak: BattleSnapshot = { ...fresh(), enemy: { ...fresh().enemy!, hp: 1 } };
    const folded = foldBattleTicks(weak, 1000);
    expect(folded.status).not.toBe("active");
    expect(folded.elapsedTicks).toBeLessThan(1000);
  });

  it("idle（戦闘中でない）状態は変えない", () => {
    const idle: BattleSnapshot = { ...fresh(), status: "idle" };
    expect(foldBattleTicks(idle, 10)).toBe(idle);
  });
});
