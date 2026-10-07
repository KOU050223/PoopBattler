import { describe, expect, it } from "vitest";

import { lineupOwnedIds } from "@poopbattler/domain/records/party-lineup";

import {
  PARTY_LINEUP_STORAGE_KEY,
  readPartyLineup,
  subscribePartyLineup,
  writePartyLineup,
} from "./party-lineup-storage";

describe("party lineup storage", () => {
  it("先発の所有IDだけを保存し、壊れたJSONは無視する", () => {
    const stored: Record<string, string> = {};
    const storage = {
      getItem: (key: string) => stored[key] ?? null,
      setItem: (key: string, value: string) => {
        stored[key] = value;
      },
    };

    writePartyLineup(storage, ["c", "a", null]);
    expect(stored[PARTY_LINEUP_STORAGE_KEY]).toBe(JSON.stringify(["c", "a"]));
    expect(lineupOwnedIds(["c", "a", null])).toEqual(["c", "a"]);
    expect(readPartyLineup(storage)).toEqual(["c", "a"]);

    stored[PARTY_LINEUP_STORAGE_KEY] = "{";
    expect(readPartyLineup(storage)).toBeNull();
    expect(readPartyLineup(null)).toBeNull();
  });

  it("保存したら購読者に知らせる", () => {
    const storage = {
      getItem: () => null,
      setItem: () => undefined,
    };
    const seen: string[] = [];
    const unsubscribe = subscribePartyLineup(() => seen.push("changed"));
    writePartyLineup(storage, ["a", "b", null]);
    expect(seen).toEqual(["changed"]);
    unsubscribe();
    writePartyLineup(storage, ["a", "b", "c"]);
    expect(seen).toEqual(["changed"]);
  });
});
