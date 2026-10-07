import { describe, expect, it } from "vitest";
import type { KeyValueStorage } from "@poopbattler/domain/ports";

import { loadPartyLineup, PARTY_LINEUP_STORAGE_KEY, writePartyLineup } from "./party-lineup-storage";

function memory(initial?: string): KeyValueStorage & { raw(): string | null } {
  let value = initial ?? null;
  return {
    getItem: async () => value,
    setItem: async (_k, v) => void (value = v),
    removeItem: async () => void (value = null),
    raw: () => value,
  };
}

describe("party lineup 永続化", () => {
  it("保存して読み戻せる（所持から外れた個体は落ち、枠は新しい順で埋まる）", async () => {
    const s = memory();
    await writePartyLineup(s, ["b", null, "a"] as never);
    expect(JSON.parse(s.raw()!)).toEqual(["b", "a"]);
    expect(await loadPartyLineup(s, ["a", "b", "c"])).toEqual(["b", "a", "c"]);
    expect(await loadPartyLineup(s, ["a", "c"])).toEqual(["a", "c", null]);
  });

  it("未保存・壊れたJSONは既定の並び（新しい順の左詰め）になる", async () => {
    expect(await loadPartyLineup(memory(), ["a", "b"])).toEqual(["a", "b", null]);
    expect(await loadPartyLineup(memory("{not json"), ["a"])).toEqual(["a", null, null]);
  });

  it("web と同じキーを使う", () => {
    expect(PARTY_LINEUP_STORAGE_KEY).toBe("poop-battler.party-lineup");
  });
});
