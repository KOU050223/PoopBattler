import Link from "next/link";

import { ATTRIBUTE_LABELS } from "@/features/battle/battle.constants";
import { PoopmFigure } from "@/features/poopm/components/poopm-figure";
import { appearanceForCharacter } from "@/features/poopm/poopm.appearances";
import { EmptyState } from "@/components/ui/empty-state";

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

export function CollectionList({ characters }: { characters: CollectionCharacter[] }) {
  if (characters.length === 0) {
    return (
      <EmptyState
        title="まだ仲間がいません"
        description="食事を記録してバトルに勝つと、敵が仲間になることがあります。"
        action={(
          <div className="flex gap-3">
            <Link
              href="/meals"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
            >
              食事を記録する
            </Link>
            <Link
              href="/battle"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              バトルへ行く
            </Link>
          </div>
        )}
      />
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2" aria-label="取得済みキャラクター">
      {characters.map((character) => (
        <li
          key={character.ownershipId}
          className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <div className="flex items-start gap-4">
            <PoopmFigure
              appearance={appearanceForCharacter(character.id)}
              facing="front"
              motion="idle"
              label={character.name}
              className="h-24 w-24 shrink-0"
            />
            <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
              <p className="min-w-0 font-semibold">{character.name}</p>
              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                {COLLECTION_RARITY_LABELS[character.rarity]}
              </span>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-zinc-600 dark:text-zinc-400">属性</dt>
              <dd>{ATTRIBUTE_LABELS[character.attribute]}</dd>
            </div>
            <div>
              <dt className="text-zinc-600 dark:text-zinc-400">取得日時</dt>
              <dd>{formatAcquiredAt(character.acquiredAt)}</dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}
