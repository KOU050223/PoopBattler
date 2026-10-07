import { describe, expect, it } from "vitest";

import { fillParty, fillRentalParty, toStartMember } from "./rental-party";

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

describe("fillParty", () => {
  const ownedMember = {
    ...toStartMember(curry),
    userCharacterId: "uc-1",
    hp: 260,
    power: 22,
    speed: 19,
  };
  const rentals = fillRentalParty([normalA]);

  it("所持3体ならレンタルを足さない", () => {
    const owned = [
      ownedMember,
      { ...ownedMember, userCharacterId: "uc-2" },
      { ...ownedMember, userCharacterId: "uc-3" },
    ];
    expect(fillParty(owned, rentals ?? [])).toEqual(owned);
  });

  it("所持1体なら残り2枠をレンタルにする", () => {
    const party = fillParty([ownedMember], rentals ?? []);
    expect(party?.map((member) => member.userCharacterId)).toEqual([
      "uc-1",
      null,
      null,
    ]);
  });

  it("レンタル候補が無い状態で所持が足りないと埋めない", () => {
    expect(fillParty([ownedMember], [])).toBeNull();
  });
});
