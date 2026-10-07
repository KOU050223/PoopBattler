import AsyncStorage from "@react-native-async-storage/async-storage";
import type { KeyValueStorage, SyncKeyValueStorage } from "@poopbattler/domain/ports";

type AsyncStorageLike = Pick<typeof AsyncStorage, "getItem" | "setItem" | "removeItem">;

export function createKeyValueStorage(backend: AsyncStorageLike = AsyncStorage): KeyValueStorage {
  return {
    getItem: (key) => backend.getItem(key),
    setItem: (key, value) => backend.setItem(key, value),
    removeItem: (key) => backend.removeItem(key),
  };
}

export type CachedSyncStorage = SyncKeyValueStorage & {
  /** 起動時に一度呼び、AsyncStorage の値をメモリへ載せる。呼ぶ前の getItem は null を返す。 */
  hydrate(keys: readonly string[]): Promise<void>;
};

/** 読みはメモリ、書きはメモリ即時反映＋AsyncStorage へ書き戻し（失敗はメモリ値を残して握りつぶさず通知）。 */
export function createSyncStorage(
  backend: KeyValueStorage,
  onWriteError: (error: unknown) => void = (error) => console.warn("ストレージへの書き込みに失敗:", error),
): CachedSyncStorage {
  const cache = new Map<string, string>();
  return {
    async hydrate(keys) {
      const entries = await Promise.all(keys.map(async (key) => [key, await backend.getItem(key)] as const));
      for (const [key, value] of entries) {
        if (value != null) cache.set(key, value);
        else cache.delete(key);
      }
    },
    getItem: (key) => cache.get(key) ?? null,
    setItem(key, value) {
      cache.set(key, value);
      backend.setItem(key, value).catch(onWriteError);
    },
    removeItem(key) {
      cache.delete(key);
      backend.removeItem(key).catch(onWriteError);
    },
  };
}

export const keyValueStorage = createKeyValueStorage();
export const syncStorage = createSyncStorage(keyValueStorage);
