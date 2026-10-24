import { describe, expect, it, vi } from "vitest";

import { createCachedSyncStorage, type AsyncBacking } from "./battle-speed-storage";
import {
  BATTLE_RENDER_MODE_STORAGE_KEY,
  readBattleRenderMode,
  subscribeBattleRenderMode,
  writeBattleRenderMode,
} from "./battle-render-mode-storage";

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

const KEYS = [BATTLE_RENDER_MODE_STORAGE_KEY];

describe("battle render mode storage", () => {
  it("未保存ならデフォルトは 3d", async () => {
    const { storage, load } = createCachedSyncStorage(backing(), KEYS);
    await load();
    expect(readBattleRenderMode(storage)).toBe("3d");
    expect(readBattleRenderMode(null)).toBe("3d");
  });

  it("保存済みの 2d を load 後に復元する", async () => {
    const { storage, load } = createCachedSyncStorage(backing({ [BATTLE_RENDER_MODE_STORAGE_KEY]: "2d" }), KEYS);
    expect(readBattleRenderMode(storage)).toBe("3d");
    await load();
    expect(readBattleRenderMode(storage)).toBe("2d");
  });

  it("書き込みは即時反映・永続化・購読通知される", () => {
    const b = backing();
    const { storage } = createCachedSyncStorage(b, KEYS);
    const listener = vi.fn();
    const unsubscribe = subscribeBattleRenderMode(listener);
    writeBattleRenderMode(storage, "2d");
    expect(readBattleRenderMode(storage)).toBe("2d");
    expect(b.setItem).toHaveBeenCalledWith(BATTLE_RENDER_MODE_STORAGE_KEY, "2d");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("不正な保存値はデフォルトに戻る", async () => {
    const { storage, load } = createCachedSyncStorage(backing({ [BATTLE_RENDER_MODE_STORAGE_KEY]: "4d" }), KEYS);
    await load();
    expect(readBattleRenderMode(storage)).toBe("3d");
  });
});
