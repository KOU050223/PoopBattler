"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

import { PoopmFigure } from "@/features/poopm/components/poopm-figure";
import { appearanceForCharacter } from "@/features/poopm/poopm.appearances";
import { captionTextClass, cardClass } from "@/lib/ui-classes";

import type { CollectionCharacter } from "../character.types";
import {
  getPartyLineupSnapshot,
  resolveLineup,
  subscribePartyLineup,
  swapLineupSlot,
  writePartyLineup,
} from "../party-lineup";
import { CollectionList, InventoryHint } from "./collection-list";

type InventoryScreenProps = {
  characters: CollectionCharacter[];
};

function parseStoredLineup(raw: string | null): unknown {
  if (raw == null) {
    return null;
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function characterByOwnership(
  characters: CollectionCharacter[],
  ownershipId: string | null,
) {
  if (ownershipId == null) {
    return undefined;
  }
  return characters.find((character) => character.ownershipId === ownershipId);
}

export function InventoryScreen({ characters }: InventoryScreenProps) {
  const ownedIds = useMemo(
    () => characters.map((character) => character.ownershipId),
    [characters],
  );
  const storedJson = useSyncExternalStore(
    subscribePartyLineup,
    getPartyLineupSnapshot,
    () => null,
  );
  const lineup = useMemo(
    () => resolveLineup(parseStoredLineup(storedJson), ownedIds),
    [ownedIds, storedJson],
  );
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const starterIds = useMemo(
    () => new Set(lineup.filter((id): id is string => id != null)),
    [lineup],
  );

  function selectSlot(index: number) {
    if (lineup[index] == null) {
      return;
    }
    setSelectedSlot((current) => (current === index ? null : index));
  }

  function pickCharacter(ownershipId: string) {
    if (selectedSlot == null) {
      return;
    }
    writePartyLineup(
      window.localStorage,
      swapLineupSlot(lineup, selectedSlot, ownershipId),
    );
    setSelectedSlot(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3" aria-labelledby="starter-heading">
        <div className="flex flex-col gap-1">
          <h2 id="starter-heading" className="text-[19px] font-bold leading-[1.4] text-charcoal">
            先発
          </h2>
          <InventoryHint
            hasCharacters={characters.length > 0}
            slotSelected={selectedSlot != null}
          />
        </div>
        <ul className="grid grid-cols-3 gap-2" aria-label="先発3枠">
          {lineup.map((ownershipId, index) => {
            const character = characterByOwnership(characters, ownershipId);
            const selected = selectedSlot === index;
            const isRental = character == null;

            return (
              <li key={index}>
                {isRental ? (
                  <div
                    className={`${cardClass} flex min-h-36 flex-col items-center justify-center gap-2 border-dashed bg-blush-wash/40 p-3 text-center`}
                  >
                    <p className="text-sm font-bold text-charcoal">空き</p>
                    <p className={captionTextClass}>レンタル</p>
                  </div>
                ) : (
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => selectSlot(index)}
                    className={`${cardClass} flex min-h-36 w-full flex-col items-center gap-2 p-3 text-center ${
                      selected ? "border-flush-pink bg-blush-wash" : ""
                    }`}
                  >
                    <PoopmFigure
                      appearance={appearanceForCharacter(character.id)}
                      facing="front"
                      motion="idle"
                      label={character.name}
                      className="h-16 w-16"
                    />
                    <p className="w-full truncate text-xs font-bold text-charcoal">
                      {character.name}
                    </p>
                    <p className={captionTextClass}>先発{index + 1}</p>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="owned-heading">
        <h2 id="owned-heading" className="text-[19px] font-bold leading-[1.4] text-charcoal">
          所持
        </h2>
        <CollectionList
          characters={characters}
          starterIds={starterIds}
          swapEnabled={selectedSlot != null}
          onPick={pickCharacter}
        />
      </section>
    </div>
  );
}
