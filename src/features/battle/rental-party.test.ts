import { describe, expect, it } from "vitest";

import { fillRentalParty, toStartMember } from "./rental-party";

const normalA = {
  id: "normal-poop",
  name: "ふつうのうんちくん",
  attribute: "normal" as const,
};
const normalB = {
  id: "golden-poop",
  name: "ゴールデンうんちくん",
  attribute: "normal" as const,
};
const curry = {
  id: "curry-poop",
  name: "カレーうんちくん",
  attribute: "curry" as const,
};

describe("fillRentalParty", () => {
  it("所持0でも normal のレンタルで3枠を埋める", () => {
    expect(fillRentalParty([normalA])).toEqual([
      toStartMember(normalA),
      toStartMember(normalA),
      toStartMember(normalA),
    ]);
  });

  it("normal が2体なら繰り返して3枠にする", () => {
    const party = fillRentalParty([normalA, normalB]);
    expect(party?.map((member) => member.characterId)).toEqual([
      "normal-poop",
      "golden-poop",
      "normal-poop",
    ]);
  });

  it("normal 以外だけでは埋めない", () => {
    expect(fillRentalParty([])).toBeNull();
    expect(fillRentalParty([curry])).toBeNull();
  });
});
