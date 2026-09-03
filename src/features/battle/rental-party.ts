import { FALLBACK_ATTRIBUTE, PARTY_SIZE } from "./battle.constants";
import type { BattleStartMember } from "./battle.types";

export type RentalCandidate = {
  id: string;
  name: string;
  attribute: BattleStartMember["attribute"];
};

export function toStartMember(character: RentalCandidate): BattleStartMember {
  return {
    characterId: character.id,
    attribute: character.attribute,
    name: character.name,
  };
}

export function fillRentalParty(
  characters: readonly RentalCandidate[],
): [BattleStartMember, BattleStartMember, BattleStartMember] | null {
  const rentals = characters.filter(
    (character) => character.attribute === FALLBACK_ATTRIBUTE,
  );

  if (rentals.length === 0) {
    return null;
  }

  const party: BattleStartMember[] = [];
  for (let index = 0; index < PARTY_SIZE; index += 1) {
    party.push(toStartMember(rentals[index % rentals.length]));
  }

  return [party[0], party[1], party[2]];
}
