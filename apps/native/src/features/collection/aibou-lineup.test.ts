import type { CollectionCharacter } from "@poopbattler/domain/records/character.types";
import { describe, expect, it } from "vitest";

import { companionLevel, currentCompanion, switchCompanion } from "./aibou-lineup";

const character = (ownershipId: string, tier = 0, rank = 0) =>
  ({ ownershipId, tier, rank }) as unknown as CollectionCharacter;

// 新しい順: a, b, c, d
const owned = [character("a"), character("b"), character("c"), character("d")];

describe("switchCompanion", () => {
  it("next は2番目の個体を1枠目に入れ、元の1枠目を2枠目へ回す", () => {
    expect(switchCompanion(owned, ["a", "b", "c"], "next")).toEqual(["b", "a", "c"]);
  });

  it("ベンチの個体へ切り替えると、その個体が1枠目に来て元の1枠目はベンチへ下がる", () => {
    expect(switchCompanion(owned, ["a", "b", "c"], "previous")).toEqual(["d", "b", "c"]);
  });

  it("末尾から next すると先頭の個体に戻る", () => {
    expect(switchCompanion(owned, ["d", "a", "b"], "next")).toEqual(["a", "d", "b"]);
  });

  it("保存がないときは新しい順の編成から切り替える", () => {
    expect(switchCompanion(owned, null, "next")).toEqual(["b", "a", "c"]);
  });

  it("所持が1体だけなら編成は変わらない", () => {
    expect(switchCompanion([character("a")], ["a"], "next")).toEqual(["a", null, null]);
  });

  it("所持が0体なら全枠が空のまま", () => {
    expect(switchCompanion([], null, "next")).toEqual([null, null, null]);
  });
});

describe("currentCompanion", () => {
  it("1枠目の個体を返す", () => {
    expect(currentCompanion(owned, ["c", "a", null])?.ownershipId).toBe("c");
  });

  it("1枠目が空なら undefined", () => {
    expect(currentCompanion([], [null, null, null])).toBeUndefined();
  });
});

describe("companionLevel", () => {
  it("★1・0凸はレベル1", () => {
    expect(companionLevel({ tier: 0, rank: 0 })).toBe(1);
  });

  it("★3・4凸は最大のレベル13", () => {
    expect(companionLevel({ tier: 2, rank: 4 })).toBe(13);
  });
});
