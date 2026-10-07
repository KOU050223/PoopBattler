import { BATTLE_SPEED_STORAGE_KEY } from "@poopbattler/domain/battle/battle.constants";
import type { SyncKeyValueStorage } from "@poopbattler/domain/ports";

export type AsyncBacking = {
  multiGet: (keys: readonly string[]) => Promise<readonly (readonly [string, string | null])[]>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

/**
 * 同期ポート（SyncKeyValueStorage）を AsyncStorage の上に載せる。
 * 読みはメモリキャッシュ、書きはキャッシュ即時＋裏で永続化。
 * load() を待ってから読むこと。待たないと保存済みの値が見えずデフォルトに戻る。
 */
export function createCachedSyncStorage(
  backing: AsyncBacking,
  keys: readonly string[] = [BATTLE_SPEED_STORAGE_KEY],
) {
  const cache = new Map<string, string>();
  const storage: SyncKeyValueStorage = {
    getItem: (key) => cache.get(key) ?? null,
    setItem: (key, value) => {
      cache.set(key, value);
      backing.setItem(key, value).catch((e) => console.warn("[battle-speed] 保存に失敗:", e));
    },
    removeItem: (key) => {
      cache.delete(key);
      backing.removeItem(key).catch((e) => console.warn("[battle-speed] 削除に失敗:", e));
    },
  };

  let loading: Promise<void> | undefined;
  const load = () =>
    (loading ??= backing
      .multiGet(keys)
      .then((pairs) => {
        for (const [key, value] of pairs) if (value !== null && !cache.has(key)) cache.set(key, value);
      })
      .catch((e) => console.warn("[battle-speed] 読み込みに失敗:", e)));

  return { storage, load };
}
