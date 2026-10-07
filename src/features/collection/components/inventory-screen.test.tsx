import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("../actions", () => ({
  evolveCharacterAction: vi.fn(),
  mergeCharactersAction: vi.fn(),
}));

import type { CollectionCharacter } from "../character.types";
import { MergeConfirm } from "./character-growth-sheet";
import { CollectionList } from "./collection-list";
import { InventoryScreen } from "./inventory-screen";

const characters: CollectionCharacter[] = [
  {
    ownershipId: "own-1",
    acquiredAt: "2026-09-03T07:00:00.000Z",
    tier: 1,
    rank: 3,
    baseStats: { hp: 180, power: 15, speed: 13 },
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
    tier: 0,
    rank: 0,
    baseStats: { hp: 240, power: 20, speed: 20 },
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
        onOpenGrowth={() => undefined}
      />,
    );

    expect(markup).toContain("選出中");
    expect(markup).toContain("所持キャラクター");
    expect(markup).toContain("252");
    // 図鑑のフィギュアは3D版。SSRでは role="img" の器だけ出る（Canvasはクライアントで遅延マウント）。
    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="カレーうんちくん"');
    // ★と凸は1語で読み上げる。
    expect(markup).toContain('aria-label="★2・3凸"');
    expect(markup).toContain('aria-label="★1・0凸"');
  });

  it("入れ替え中でなければ、タップで育成を開く", () => {
    const markup = renderToStaticMarkup(
      <CollectionList
        characters={characters}
        starterIds={new Set()}
        swapEnabled={false}
        onPick={() => undefined}
        onOpenGrowth={() => undefined}
      />,
    );

    expect(markup).toContain('aria-label="カレーうんちくんを育てる"');
    expect(markup).not.toContain("disabled");
  });
});

describe("MergeConfirm", () => {
  const base: CollectionCharacter = {
    ...characters[1],
    ownershipId: "base",
  };

  function render(material: CollectionCharacter, materialInParty = false) {
    return renderToStaticMarkup(
      <MergeConfirm
        base={base}
        material={material}
        materialInParty={materialInParty}
        isPending={false}
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />,
    );
  }

  it("未育成で個体値も低い素材なら警告を出さない", () => {
    const markup = render({ ...base, ownershipId: "material", baseStats: { hp: 240, power: 19, speed: 20 } });

    expect(markup).not.toContain('role="alert"');
    expect(markup).not.toContain("育てた分");
    expect(markup).not.toContain("個体値が高め");
    expect(markup).toContain(">合成する<");
    // 凸と実効値の変化を見せる。common 1凸 = ×1.05。
    expect(markup).toContain("0 → 1");
    expect(markup).toContain("252");
  });

  it("育成済みの素材には取り返しがつかない旨の警告を出す", () => {
    const markup = render({ ...base, ownershipId: "material", tier: 1, rank: 2 });

    expect(markup).toContain("★2・2凸まで育っています");
    expect(markup).toContain("それでも合成する");
  });

  it("素材の個体値が高い・先発にいるときは注意を出す", () => {
    const markup = render(
      { ...base, ownershipId: "material", baseStats: { hp: 260, power: 22, speed: 22 } },
      true,
    );

    expect(markup).toContain("個体値が高め");
    expect(markup).toContain("先発から外れ");
    expect(markup).toContain(">合成する<");
  });
});
