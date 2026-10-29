import { growthStep } from "@poopbattler/domain/records/character-growth";
import type { CollectionCharacter } from "@poopbattler/domain/records/character.types";
import { resolveLineup, swapLineupSlot, type PartyLineup } from "@poopbattler/domain/records/party-lineup";

export type CompanionDirection = "previous" | "next";

const COMPANION_SLOT = 0;

/** ホームは編成の1枠目を相棒として出すので、相棒 = 1枠目。 */
export function currentCompanion(
  characters: readonly CollectionCharacter[],
  lineup: PartyLineup,
): CollectionCharacter | undefined {
  return characters.find((character) => character.ownershipId === lineup[COMPANION_SLOT]);
}

/**
 * 所持の並び（新しい順）をぐるっと回って隣の個体を相棒にする。
 * 選んだ個体を1枠目へ入れ、元の1枠目は swapLineupSlot の規則で2枠目以降に回る。
 * 所持が1体以下なら切り替えようがないので lineup をそのまま返す。
 */
export function switchCompanion(
  characters: readonly CollectionCharacter[],
  stored: unknown,
  direction: CompanionDirection,
): PartyLineup {
  const ownedIds = characters.map((character) => character.ownershipId);
  const lineup = resolveLineup(stored, ownedIds);
  if (ownedIds.length < 2) return lineup;

  const currentIndex = Math.max(0, ownedIds.indexOf(lineup[COMPANION_SLOT] ?? ""));
  const step = direction === "next" ? 1 : -1;
  const targetId = ownedIds[(currentIndex + step + ownedIds.length) % ownedIds.length];
  return swapLineupSlot(lineup, COMPANION_SLOT, targetId);
}

/** ★と凸の進行度（0〜12）を、子ども向けに 1 から数えるレベルとして見せる。 */
export function companionLevel(character: Pick<CollectionCharacter, "tier" | "rank">): number {
  return growthStep(character) + 1;
}
