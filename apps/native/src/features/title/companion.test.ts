import type { CollectionCharacter } from "@poopbattler/domain/records/character.types";
import { describe, expect, it } from "vitest";

import { pickCompanion } from "./companion";

const owned = (ownershipId: string) => ({ ownershipId, id: `char-${ownershipId}`, name: ownershipId }) as CollectionCharacter;

describe("pickCompanion", () => {
  it("所持キャラが無ければ undefined", () => {
    expect(pickCompanion([], [null, null, null])).toBeUndefined();
  });

  it("編成の1枠目のキャラを返す（2枠目ではない）", () => {
    const characters = [owned("a"), owned("b")];
    expect(pickCompanion(characters, ["b", "a", null])?.ownershipId).toBe("b");
  });

  it("1枠目が空なら undefined", () => {
    expect(pickCompanion([owned("a")], [null, "a", null])).toBeUndefined();
  });

  it("1枠目のIDが所持に無ければ undefined", () => {
    expect(pickCompanion([owned("a")], ["x", null, null])).toBeUndefined();
  });
});
