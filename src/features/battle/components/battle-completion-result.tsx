"use client";

import Link from "next/link";

import { ATTRIBUTE_LABELS } from "@/features/battle/battle.constants";
import type { CompleteBattleResult } from "@/features/battle/actions";
import { PoopmFigure } from "@/features/poopm/components/poopm-figure";
import { appearanceForCharacter } from "@/features/poopm/poopm.appearances";
import { mutedTextClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui-classes";

type CompletionSuccess = Extract<CompleteBattleResult, { success: true }>;

function formatCompletedAt(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function BattleCompletionResult({ result }: { result: CompletionSuccess }) {
  const character = result.acquiredCharacter;

  return (
    <section className="flex flex-col items-center gap-5 rounded-2xl border-2 border-faded-gray bg-paper-white px-5 py-8 text-center shadow-raised-gray">
      <div className="flex flex-col gap-1">
        <p className="text-xl font-bold text-charcoal">
          {character ? "仲間になった！" : "バトルを記録しました"}
        </p>
        <p className={mutedTextClass}>
          確定日時: {formatCompletedAt(result.completedAt)}
        </p>
      </div>

      {character ? (
        <div className="flex w-full items-center gap-4 rounded-xl bg-blush-wash p-4 text-left">
          <PoopmFigure
            appearance={appearanceForCharacter(character.id)}
            facing="front"
            motion="idle"
            label={character.name}
            className="h-24 w-24 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-charcoal">{character.name}</p>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-pencil-gray">属性</dt>
                <dd>{ATTRIBUTE_LABELS[character.attribute]}</dd>
              </div>
              <div>
                <dt className="text-pencil-gray">レアリティ</dt>
                <dd>{character.rarity}</dd>
              </div>
            </dl>
          </div>
        </div>
      ) : (
        <p className={`text-sm ${mutedTextClass}`}>
          {result.usedMealLog
            ? "今回は仲間になりませんでした。仲間化抽選は確定済みのため、再抽選はできません。"
            : "この回は仲間になりません。食事ログがないと、仲間化抽選は行いません。"}
        </p>
      )}

      <div className="grid w-full grid-cols-2 gap-3">
        <Link href="/collection" className={`flex items-center justify-center ${primaryButtonClass}`}>
          インベントリを見る
        </Link>
        <Link href="/logs" className={`flex items-center justify-center ${secondaryButtonClass}`}>
          履歴を見る
        </Link>
      </div>
    </section>
  );
}
