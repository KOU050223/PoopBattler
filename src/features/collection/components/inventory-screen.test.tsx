import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { CollectionCharacter } from "../character.types";
import { CollectionList } from "./collection-list";
import { InventoryScreen } from "./inventory-screen";

const characters: CollectionCharacter[] = [
  {
    ownershipId: "own-1",
    acquiredAt: "2026-09-03T07:00:00.000Z",
    hp: 252,
    power: 21,
    speed: 18,
    id: "curry-poop",
    name: "カレーうんちくん",
    attribute: "curry",
    rarity: "rare",
  },
  {
    ownershipId: "own-2",
    acquiredAt: "2026-09-02T07:00:00.000Z",
    hp: 240,
    power: 20,
    speed: 20,
    id: "normal-poop",
    name: "ふつうのうんちくん",
    attribute: "normal",
    rarity: "common",
  },
];

describe("InventoryScreen", () => {
  it("先発3枠と所持リストを出し、レンタル枠と選出中が分かる", () => {
    const markup = renderToStaticMarkup(
      <InventoryScreen characters={characters} />,
    );

    expect(markup).toContain("先発");
    expect(markup).toContain("所持");
    expect(markup).toContain("先発3枠");
    expect(markup).toContain("レンタル");
    expect(markup).toContain("選出中");
    expect(markup).toContain("カレーうんちくん");
    expect(markup).toContain("ふつうのうんちくん");
    expect(markup).not.toContain("図鑑");
  });

  it("仲間がいないときは先発がレンタル枠になり、所持は空状態になる", () => {
    const markup = renderToStaticMarkup(<InventoryScreen characters={[]} />);

    expect(markup).toContain("レンタル");
    expect(markup).toContain("まだ仲間がいません");
    expect(markup).not.toContain("先発枠を選んでから");
  });
});

describe("CollectionList", () => {
  it("選出中の個体と入れ替え可能なリストを出す", () => {
    const markup = renderToStaticMarkup(
      <CollectionList
        characters={characters}
        starterIds={new Set(["own-1"])}
        swapEnabled
        onPick={() => undefined}
      />,
    );

    expect(markup).toContain("選出中");
    expect(markup).toContain("所持キャラクター");
    expect(markup).toContain("252");
  });
});
