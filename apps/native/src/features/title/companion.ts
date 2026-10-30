import type { CollectionCharacter } from "@poopbattler/domain/records/character.types";
import type { PartyLineup } from "@poopbattler/domain/records/party-lineup";

/** 編成の1枠目にいる所持キャラ。まだ持っていない・編成が空のときは undefined。 */
export function pickCompanion(
  characters: readonly CollectionCharacter[],
  lineup: PartyLineup,
): CollectionCharacter | undefined {
  const [firstId] = lineup;
  if (firstId == null) return undefined;
  return characters.find((character) => character.ownershipId === firstId);
}
