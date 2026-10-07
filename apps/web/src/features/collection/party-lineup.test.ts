import { describe, expect, it } from "vitest";

import {
  defaultLineup,
  lineupOwnedIds,
  parsePartyLineup,
  PARTY_LINEUP_STORAGE_KEY,
  readPartyLineup,
  resolveLineup,
  subscribePartyLineup,
  swapLineupSlot,
  writePartyLineup,
} from "./party-lineup";

const owned = ["a", "b", "c", "d"];

describe("parsePartyLineup", () => {
  it("文字列以外・空文字・重複を落とし、最大3件にする", () => {
    expect(parsePartyLineup(["a", "", "a", 1, "b", "c", "d"])).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("配列でなければ空にする", () => {
    expect(parsePartyLineup(null)).toEqual([]);
    expect(parsePartyLineup({ ids: ["a"] })).toEqual([]);
  });
});

describe("defaultLineup / resolveLineup", () => {
  it("所持が3体以上なら新しい順に3枠埋める", () => {
    expect(defaultLineup(owned)).toEqual(["a", "b", "c"]);
  });

  it("所持が3体未満なら残りはレンタル枠にする", () => {
    expect(defaultLineup(["a", "b"])).toEqual(["a", "b", null]);
    expect(defaultLineup([])).toEqual([null, null, null]);
  });

  it("保存済みの先発を優先し、今持っていないIDは落とす", () => {
    expect(resolveLineup(["c", "gone", "d"], owned)).toEqual(["c", "d", "a"]);
  });

  it("保存が空なら新しい順の既定に戻す", () => {
    expect(resolveLineup(null, owned)).toEqual(["a", "b", "c"]);
  });

  it("所持2体の保存なら3枠目はレンタルのままにする", () => {
    expect(resolveLineup(["b"], ["a", "b"])).toEqual(["b", "a", null]);
  });
});

describe("swapLineupSlot", () => {
  it("ベンチの個体と選択枠を入れ替える", () => {
    expect(swapLineupSlot(["a", "b", "c"], 1, "d")).toEqual(["a", "d", "c"]);
  });

  it("既に先発の個体なら枠同士を入れ替える", () => {
    expect(swapLineupSlot(["a", "b", "c"], 0, "c")).toEqual(["c", "b", "a"]);
  });

  it("同じ枠の個体を選んでも変えない", () => {
    expect(swapLineupSlot(["a", "b", "c"], 2, "c")).toEqual(["a", "b", "c"]);
  });

  it("範囲外の枠は無視する", () => {
    expect(swapLineupSlot(["a", "b", "c"], 3, "d")).toEqual(["a", "b", "c"]);
    expect(swapLineupSlot(["a", "b", "c"], -1, "d")).toEqual(["a", "b", "c"]);
  });

  it("入れ替え後の空きは左詰めしてレンタル枠を右に寄せる", () => {
    expect(swapLineupSlot(["a", "b", null], 1, "a")).toEqual(["b", "a", null]);
  });
});

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
