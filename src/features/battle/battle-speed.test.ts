import { describe, expect, it } from "vitest";

import { readBattleSpeed, writeBattleSpeed } from "./battle-speed";
import {
  BATTLE_SPEED_STORAGE_KEY,
  DEFAULT_BATTLE_SPEED,
  nextBattleSpeed,
  scaleByBattleSpeed,
  tickIntervalMs,
  TICK_INTERVAL_MS,
} from "./battle.constants";

function memoryStorage(initial?: Record<string, string>) {
  const data = new Map(Object.entries(initial ?? {}));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

describe("battle speed", () => {
  it("等倍は 500ms、倍速は 250ms である", () => {
    expect(tickIntervalMs(1)).toBe(TICK_INTERVAL_MS);
    expect(tickIntervalMs(2)).toBe(TICK_INTERVAL_MS / 2);
    expect(scaleByBattleSpeed(350, 2)).toBe(175);
    expect(nextBattleSpeed(1)).toBe(2);
    expect(nextBattleSpeed(2)).toBe(1);
  });

  it("未保存と不正値は等倍に戻す", () => {
    expect(readBattleSpeed(null)).toBe(DEFAULT_BATTLE_SPEED);
    expect(readBattleSpeed(memoryStorage())).toBe(DEFAULT_BATTLE_SPEED);
    expect(
      readBattleSpeed(memoryStorage({ [BATTLE_SPEED_STORAGE_KEY]: "3" })),
    ).toBe(DEFAULT_BATTLE_SPEED);
  });

  it("保存した 2 を読み戻す", () => {
    const storage = memoryStorage();
    writeBattleSpeed(storage, 2);
    expect(readBattleSpeed(storage)).toBe(2);
  });
});
