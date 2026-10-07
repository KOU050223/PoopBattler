import { describe, expect, it, vi } from "vitest";
import type { KeyValueStorage } from "@poopbattler/domain/ports";

vi.mock("@react-native-async-storage/async-storage", () => ({ default: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() } }));

import { createKeyValueStorage, createSyncStorage } from "./storage";

function memoryBackend(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const backend: KeyValueStorage = {
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => void data.set(k, v),
    removeItem: async (k) => void data.delete(k),
  };
  return { backend, data };
}

describe("createKeyValueStorage", () => {
  it("AsyncStorage へ委譲する", async () => {
    const backend = { getItem: vi.fn(async () => "v"), setItem: vi.fn(async () => {}), removeItem: vi.fn(async () => {}) };
    const s = createKeyValueStorage(backend);
    expect(await s.getItem("k")).toBe("v");
    await s.setItem("k", "x");
    await s.removeItem("k");
    expect(backend.setItem).toHaveBeenCalledWith("k", "x");
    expect(backend.removeItem).toHaveBeenCalledWith("k");
  });
});

describe("createSyncStorage", () => {
  it("hydrate 前は null、後は同期で読め、書きは即時反映＋永続化される", async () => {
    const { backend, data } = memoryBackend({ a: "1" });
    const s = createSyncStorage(backend);
    expect(s.getItem("a")).toBeNull();
    await s.hydrate(["a", "b"]);
    expect(s.getItem("a")).toBe("1");
    expect(s.getItem("b")).toBeNull();
    s.setItem("b", "2");
    expect(s.getItem("b")).toBe("2");
    s.removeItem("a");
    expect(s.getItem("a")).toBeNull();
    await Promise.resolve();
    expect(data.get("b")).toBe("2");
    expect(data.has("a")).toBe(false);
  });

  it("書き込み失敗は握りつぶさず通知する", async () => {
    const onError = vi.fn();
    const failing: KeyValueStorage = { getItem: async () => null, setItem: async () => { throw new Error("disk"); }, removeItem: async () => {} };
    createSyncStorage(failing, onError).setItem("k", "v");
    await new Promise((r) => setTimeout(r, 0));
    expect(onError).toHaveBeenCalled();
  });
});
