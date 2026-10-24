import { describe, expect, it, vi } from "vitest";

import { BATTLE_SPEED_STORAGE_KEY } from "@poopbattler/domain/battle/battle.constants";
import { readBattleSpeed, writeBattleSpeed } from "@poopbattler/domain/battle/battle-speed";

import { createCachedSyncStorage, type AsyncBacking } from "./battle-speed-storage";

function backing(initial: Record<string, string> = {}): AsyncBacking & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    multiGet: vi.fn(async (keys: readonly string[]) => keys.map((k) => [k, data[k] ?? null] as const)),
    setItem: vi.fn(async (k: string, v: string) => {
      data[k] = v;
    }),
    removeItem: vi.fn(async (k: string) => {
      delete data[k];
    }),
  };
}

describe("createCachedSyncStorage", () => {
  it("load 前は未保存扱い、load 後は保存済みの倍速が同期で読める", async () => {
    const { storage, load } = createCachedSyncStorage(backing({ [BATTLE_SPEED_STORAGE_KEY]: "2" }));
    expect(readBattleSpeed(storage)).toBe(1);
    await load();
    expect(readBattleSpeed(storage)).toBe(2);
  });

  it("書き込みはキャッシュへ即時反映し、裏で永続化する", () => {
    const b = backing();
    const { storage } = createCachedSyncStorage(b);
    writeBattleSpeed(storage, 2);
    expect(readBattleSpeed(storage)).toBe(2);
    expect(b.setItem).toHaveBeenCalledWith(BATTLE_SPEED_STORAGE_KEY, "2");
  });

  it("load 中に書かれた値を、遅れて届いた古い保存値で上書きしない", async () => {
    const { storage, load } = createCachedSyncStorage(backing({ [BATTLE_SPEED_STORAGE_KEY]: "1" }));
    writeBattleSpeed(storage, 2);
    await load();
    expect(readBattleSpeed(storage)).toBe(2);
  });

  it("読み込み失敗でもデフォルト倍速で動く", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const b = backing();
    b.multiGet = vi.fn(async () => {
      throw new Error("io");
    });
    const { storage, load } = createCachedSyncStorage(b);
    await load();
    expect(readBattleSpeed(storage)).toBe(1);
  });

  it("不正な保存値はデフォルトに戻る", async () => {
    const { storage, load } = createCachedSyncStorage(backing({ [BATTLE_SPEED_STORAGE_KEY]: "abc" }));
    await load();
    expect(readBattleSpeed(storage)).toBe(1);
  });
});
