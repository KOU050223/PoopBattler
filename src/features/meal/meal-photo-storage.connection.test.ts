import { afterEach, describe, expect, it, vi } from "vitest";

import { getMealPhoto } from "./meal-photo-storage";

// runTransaction の接続解放を観測する。IndexedDBの実装ではなく
// 「成功・request失敗・abort のどの経路でも close() が呼ばれるか」だけを見る。
type Outcome = "complete" | "request-error" | "abort";

function stubIndexedDB(outcome: Outcome) {
  const close = vi.fn();

  const openRequest: Record<string, unknown> = {
    result: {
      objectStoreNames: { contains: () => true },
      close,
      transaction: () => ({
        objectStore: () => ({
          get: () => {
            const request: Record<string, unknown> = { result: { id: "id", blob: "photo-blob" } };
            queueMicrotask(() => {
              const transaction = (openRequest.result as { __tx: Record<string, unknown> }).__tx;
              if (outcome === "complete") (transaction.oncomplete as () => void)();
              if (outcome === "request-error") (request.onerror as () => void)();
              if (outcome === "abort") (transaction.onabort as () => void)();
            });
            return request;
          },
        }),
      }),
    },
  };

  // transaction() の戻り値を毎回同じにして、ハンドラ登録先を追えるようにする。
  const db = openRequest.result as Record<string, unknown>;
  const tx: Record<string, unknown> = {
    objectStore: (db.transaction as () => { objectStore: () => unknown })().objectStore,
  };
  db.__tx = tx;
  db.transaction = () => tx;

  vi.stubGlobal("indexedDB", {
    open: () => {
      queueMicrotask(() => (openRequest.onsuccess as () => void)());
      return openRequest;
    },
  });

  return close;
}

afterEach(() => vi.unstubAllGlobals());

describe("runTransaction の接続解放", () => {
  it("成功時に接続を閉じる", async () => {
    const close = stubIndexedDB("complete");
    await expect(getMealPhoto("id")).resolves.toBe("photo-blob");
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("requestが失敗しても接続を閉じる", async () => {
    const close = stubIndexedDB("request-error");
    await expect(getMealPhoto("id")).rejects.toThrow("端末内の画像保存に失敗しました。");
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("transactionがabortしても接続を閉じる", async () => {
    const close = stubIndexedDB("abort");
    await expect(getMealPhoto("id")).rejects.toThrow("端末内の画像保存に失敗しました。");
    expect(close).toHaveBeenCalledTimes(1);
  });
});
