"use client";

import Link from "next/link";

import { ATTRIBUTE_LABELS } from "@/features/battle/battle.constants";
import { PoopmFigure } from "@/features/poopm/components/poopm-figure";
import { appearanceForCharacter } from "@/features/poopm/poopm.appearances";
import { EmptyState } from "@/components/ui/empty-state";
import { captionTextClass, cardClass, mutedTextClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui-classes";

import {
  COLLECTION_RARITY_LABELS,
  type CollectionCharacter,
} from "../character.types";

function formatAcquiredAt(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

type CollectionListProps = {
  characters: CollectionCharacter[];
  starterIds: ReadonlySet<string>;
  swapEnabled: boolean;
  onPick: (ownershipId: string) => void;
};

export function CollectionList({
  characters,
  starterIds,
  swapEnabled,
  onPick,
}: CollectionListProps) {
  if (characters.length === 0) {
    return (
      <EmptyState
        title="まだ仲間がいません"
        description="食事を記録してバトルに勝つと、敵が仲間になることがあります。"
        action={(
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/meals"
              className={`inline-flex items-center justify-center ${secondaryButtonClass}`}
            >
              食事を記録する
            </Link>
            <Link
              href="/battle"
              className={`inline-flex items-center justify-center ${primaryButtonClass}`}
            >
              バトルへ行く
            </Link>
          </div>
        )}
      />
    );
  }

  return (
    <ul className="grid gap-3" aria-label="所持キャラクター">
      {characters.map((character) => {
        const inParty = starterIds.has(character.ownershipId);
        return (
          <li key={character.ownershipId}>
            <button
              type="button"
              disabled={!swapEnabled}
              onClick={() => onPick(character.ownershipId)}
              className={`${cardClass} flex w-full flex-col gap-3 p-4 text-left disabled:opacity-100 ${
                inParty ? "bg-blush-wash" : ""
              } ${swapEnabled ? "cursor-pointer" : "cursor-default"}`}
            >
              <div className="flex items-start gap-4">
                <PoopmFigure
                  appearance={appearanceForCharacter(character.id)}
                  facing="front"
                  motion="idle"
                  label={character.name}
                  className="h-20 w-20 shrink-0"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 font-bold text-charcoal">{character.name}</p>
                    <span className="shrink-0 rounded-xl bg-blush-wash px-2 py-1 text-xs font-bold text-charcoal">
                      {COLLECTION_RARITY_LABELS[character.rarity]}
                    </span>
                  </div>
                  {inParty && (
                    <p className="text-xs font-bold text-flush-pink">選出中</p>
                  )}
                  <dl className={`grid grid-cols-2 gap-2 ${captionTextClass}`}>
                    <div>
                      <dt className="text-pencil-gray">属性</dt>
                      <dd className="font-bold text-charcoal">{ATTRIBUTE_LABELS[character.attribute]}</dd>
                    </div>
                    <div>
                      <dt className="text-pencil-gray">取得</dt>
                      <dd className="font-bold text-charcoal">{formatAcquiredAt(character.acquiredAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-pencil-gray">HP</dt>
                      <dd className="font-bold text-charcoal tabular-nums">{character.hp}</dd>
                    </div>
                    <div>
                      <dt className="text-pencil-gray">攻撃</dt>
                      <dd className="font-bold text-charcoal tabular-nums">{character.power}</dd>
                    </div>
                    <div>
                      <dt className="text-pencil-gray">速さ</dt>
                      <dd className="font-bold text-charcoal tabular-nums">{character.speed}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function InventoryHint({
  hasCharacters,
  slotSelected,
}: {
  hasCharacters: boolean;
  slotSelected: boolean;
}) {
  if (!hasCharacters) {
    return null;
  }

  return (
    <p className={mutedTextClass}>
      {slotSelected
        ? "入れ替える仲間を下のリストから選んでください。"
        : "先発枠を選んでから、下のリストで入れ替えます。"}
    </p>
  );
}
