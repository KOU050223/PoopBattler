import { describe, expect, it } from "vitest";

import { toLocalDayNumber } from "../streak/calc-streak";
import {
  DUPLICATE_REFUND,
  EMPTY_GACHA_STATE,
  MAX_CLAIM_DAYS,
  PULL_COST,
  STONES_PER_DAY,
  claimStones,
  pullGacha,
  type GachaState,
} from "./gacha-state";
import { POOPM_CHANCE } from "./gacha-pool";

const at = (month: number, day: number, hour = 12) => new Date(2026, month - 1, day, hour);
const now = at(10, 30, 9);
const withStones = (stones: number, rest: Partial<GachaState> = {}): GachaState => ({ ...EMPTY_GACHA_STATE, stones, ...rest });
// 頭パーツが出る乱数（うんちくんの確率帯より上）。
const HEAD_ROLL = 0.99;
const POOPM_ROLL = 0;

describe("claimStones", () => {
  it("記録がなければ石は増えない", () => {
    expect(claimStones(EMPTY_GACHA_STATE, [], now).stones).toBe(0);
  });

  it("今日の記録だけでは、まだもらえない（翌日以降に反映）", () => {
    expect(claimStones(EMPTY_GACHA_STATE, [at(10, 30, 8)], now).stones).toBe(0);
  });

  it("昨日と一昨日の記録で2日分もらえる", () => {
    expect(claimStones(EMPTY_GACHA_STATE, [at(10, 29), at(10, 28)], now).stones).toBe(STONES_PER_DAY * 2);
  });

  it("同じ日に何回記録しても1日分", () => {
    expect(claimStones(EMPTY_GACHA_STATE, [at(10, 29, 8), at(10, 29, 20)], now).stones).toBe(STONES_PER_DAY);
  });

  it("受け取り済みの日は二重にもらえない", () => {
    const first = claimStones(EMPTY_GACHA_STATE, [at(10, 29)], now);
    expect(claimStones(first, [at(10, 29)], now).stones).toBe(STONES_PER_DAY);
  });

  it("受け取り後に増えた日だけ追加でもらえる", () => {
    const first = claimStones(EMPTY_GACHA_STATE, [at(10, 28)], at(10, 29, 9));
    expect(claimStones(first, [at(10, 28), at(10, 29)], now).stones).toBe(STONES_PER_DAY * 2);
  });

  it("溜まった日数が多くても上限日数分までしかもらえない", () => {
    const logs = Array.from({ length: MAX_CLAIM_DAYS + 5 }, (_, i) => at(10, 29 - i));
    expect(claimStones(EMPTY_GACHA_STATE, logs, now).stones).toBe(STONES_PER_DAY * MAX_CLAIM_DAYS);
  });

  it("不正な日付は数えない", () => {
    expect(claimStones(EMPTY_GACHA_STATE, ["invalid"], now).stones).toBe(0);
  });

  it("受け取り日が今日の前日まで進む", () => {
    expect(claimStones(EMPTY_GACHA_STATE, [], now).lastClaimedDay).toBe(toLocalDayNumber(now) - 1);
  });
});

describe("pullGacha", () => {
  it("石が足りないと引けない", () => {
    expect(pullGacha(withStones(PULL_COST - 1), () => HEAD_ROLL)).toEqual({ status: "insufficient" });
  });

  it("頭パーツが出ると石を使い、所持に加わる", () => {
    const result = pullGacha(withStones(PULL_COST), () => HEAD_ROLL);
    if (result.status !== "ok") throw new Error("pull failed");
    expect(result.item.kind).toBe("head");
    expect(result.isDuplicate).toBe(false);
    expect(result.state.stones).toBe(0);
    expect(result.state.heads).toHaveLength(1);
  });

  it("乱数が小さいとうんちくんが出る", () => {
    const result = pullGacha(withStones(PULL_COST), () => POOPM_ROLL);
    if (result.status !== "ok") throw new Error("pull failed");
    expect(result.item.kind).toBe("poopm");
    expect(result.state.poopms).toHaveLength(1);
  });

  it("うんちくんの確率帯の境目ちょうどは頭パーツ", () => {
    const result = pullGacha(withStones(PULL_COST), () => POOPM_CHANCE);
    if (result.status !== "ok") throw new Error("pull failed");
    expect(result.item.kind).toBe("head");
  });

  it("持っているものが出ると石が少し戻り、所持は増えない", () => {
    const first = pullGacha(withStones(PULL_COST * 2), () => HEAD_ROLL);
    if (first.status !== "ok") throw new Error("first pull failed");
    const second = pullGacha(first.state, () => HEAD_ROLL);
    if (second.status !== "ok") throw new Error("second pull failed");
    expect(second.isDuplicate).toBe(true);
    expect(second.state.stones).toBe(DUPLICATE_REFUND);
    expect(second.state.heads).toHaveLength(1);
  });

  it("乱数が1に近くても範囲外にならない", () => {
    expect(pullGacha(withStones(PULL_COST), () => 0.9999999).status).toBe("ok");
  });
});
