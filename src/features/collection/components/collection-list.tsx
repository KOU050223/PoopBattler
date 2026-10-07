"use client";

import Link from "next/link";

import { ATTRIBUTE_LABELS } from "@/features/battle/battle.constants";
import { PoopmFigure3D } from "@/features/poopm-3d/components/poopm-figure-3d";
import { appearanceForCharacter } from "@/features/poopm/poopm.appearances";
import { EmptyState } from "@/components/ui/empty-state";
import { cardClass, mutedTextClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui-classes";

import {
  COLLECTION_RARITY_LABELS,
  type CollectionCharacter,
} from "../character.types";
import { GrowthBadge } from "./growth-badge";

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
  /** 先発の入れ替え中でなければ、タップで育成シートを開く。 */
  onOpenGrowth: (ownershipId: string) => void;
};

export function CollectionList({
  characters,
  starterIds,
  swapEnabled,
  onPick,
  onOpenGrowth,
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
              onClick={() => (swapEnabled ? onPick : onOpenGrowth)(character.ownershipId)}
              aria-label={swapEnabled ? `${character.name}を先発に入れる` : `${character.name}を育てる`}
              className={`${cardClass} flex w-full cursor-pointer flex-col gap-3 p-4 text-left ${
                inParty ? "bg-blush-wash" : ""
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="relative shrink-0">
                  <PoopmFigure3D
                    appearance={appearanceForCharacter(character.id)}
                    motion="idle"
                    label={character.name}
                    className="h-20 w-20"
                  />
                  {inParty && (
                    <span
                      aria-hidden="true"
                      className="absolute -left-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-paper-white bg-flush-pink text-[13px] font-black leading-none text-paper-white"
                    >
                      ✓
                    </span>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className="min-w-0 font-bold text-charcoal">{character.name}</p>
                      <GrowthBadge tier={character.tier} rank={character.rank} />
                    </div>
                    <span className="shrink-0 rounded-xl bg-blush-wash px-2 py-1 text-xs font-bold text-charcoal">
                      {COLLECTION_RARITY_LABELS[character.rarity]}
                    </span>
                  </div>
                  {inParty && <span className="sr-only">選出中</span>}
                  <dl className="flex flex-col gap-2">
                    {/* 属性・取得はサブ情報なので1行に小さくまとめる */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-[1.3]">
                      <div className="flex items-baseline gap-1">
                        <dt className="text-faded-gray">🏷️ 属性</dt>
                        <dd className="font-medium text-pencil-gray">{ATTRIBUTE_LABELS[character.attribute]}</dd>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <dt className="text-faded-gray">📅 取得</dt>
                        <dd className="font-medium text-pencil-gray">{formatAcquiredAt(character.acquiredAt)}</dd>
                      </div>
                    </div>
                    {/* バトルの数値は主役なので色違いの枠で3列に分けて大きく出す */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl border-2 border-flush-pink bg-blush-wash px-2 py-1.5 text-center">
                        <dt className="text-xs font-medium text-flush-edge">❤️ HP</dt>
                        <dd className="text-2xl font-black leading-tight tracking-tight tabular-nums text-flush-edge">
                          {character.hp}
                        </dd>
                      </div>
                      <div className="rounded-xl border-2 border-night-ink/40 bg-night-ink/5 px-2 py-1.5 text-center">
                        <dt className="text-xs font-medium text-night-ink">💪 攻撃</dt>
                        <dd className="text-2xl font-black leading-tight tracking-tight tabular-nums text-night-ink">
                          {character.power}
                        </dd>
                      </div>
                      <div className="rounded-xl border-2 border-spark-blue/40 bg-spark-blue/10 px-2 py-1.5 text-center">
                        <dt className="text-xs font-medium text-spark-blue">💨 速さ</dt>
                        <dd className="text-2xl font-black leading-tight tracking-tight tabular-nums text-spark-blue">
                          {character.speed}
                        </dd>
                      </div>
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
        : "先発枠を選んでから、下のリストで入れ替えます。仲間をタップすると合成・進化できます。"}
    </p>
  );
}
