import {
  FALLBACK_ATTRIBUTE,
  PARTY_SIZE,
  RENTAL_HP,
  RENTAL_POWER,
  RENTAL_SPEED,
} from "./battle.constants";
import type { BattleStartMember } from "./battle.types";

export type RentalCandidate = {
  id: string;
  name: string;
  attribute: BattleStartMember["attribute"];
};

/**
 * レンタル個体を選出用の1体にする。
 *
 * 所有行が無いので userCharacterId は null。3値はコード定数の固定値
 * （Issue #73）。
 */
export function toStartMember(character: RentalCandidate): BattleStartMember {
  return {
    userCharacterId: null,
    characterId: character.id,
    attribute: character.attribute,
    name: character.name,
    hp: RENTAL_HP,
    power: RENTAL_POWER,
    speed: RENTAL_SPEED,
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

/**
 * 所持個体を先に詰め、足りない枠だけレンタルで埋める（Issue #108）。
 *
 * 返す並びは「所持個体 → レンタル」で、レンタルは所有行を増やさない。
 */
export function fillParty(
  owned: readonly BattleStartMember[],
  rentals: readonly BattleStartMember[],
): [BattleStartMember, BattleStartMember, BattleStartMember] | null {
  const party = owned.slice(0, PARTY_SIZE);

  if (party.length < PARTY_SIZE && rentals.length === 0) {
    return null;
  }

  for (let index = 0; party.length < PARTY_SIZE; index += 1) {
    party.push({ ...rentals[index % rentals.length] });
  }

  return [party[0], party[1], party[2]];
}
