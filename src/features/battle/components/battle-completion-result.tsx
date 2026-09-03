"use client";

import Link from "next/link";

import { ATTRIBUTE_LABELS } from "@/features/battle/battle.constants";
import type { CompleteBattleResult } from "@/features/battle/actions";

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
    <section className="flex flex-col items-center gap-5 rounded-xl border border-zinc-200 px-5 py-8 text-center dark:border-zinc-800">
      <div className="flex flex-col gap-1">
        <p className="text-xl font-bold">
          {character ? "仲間になった！" : "バトルを記録しました"}
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          確定日時: {formatCompletedAt(result.completedAt)}
        </p>
      </div>

      {character ? (
        <div className="flex w-full flex-col gap-2 rounded-lg bg-amber-50 p-4 text-left dark:bg-amber-950/30">
          <p className="font-semibold">{character.name}</p>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-zinc-600 dark:text-zinc-400">属性</dt>
              <dd>{ATTRIBUTE_LABELS[character.attribute]}</dd>
            </div>
            <div>
              <dt className="text-zinc-600 dark:text-zinc-400">レアリティ</dt>
              <dd>{character.rarity}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          {result.usedMealLog
            ? "今回は仲間になりませんでした。仲間化抽選は確定済みのため、再抽選はできません。"
            : "この回は仲間になりません。食事写真を使わないバトルでは、仲間化抽選は行いません。"}
        </p>
      )}

      <div className="grid w-full grid-cols-2 gap-3">
        <Link
          href="/collection"
          className="rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          図鑑を見る
        </Link>
        <Link
          href="/logs"
          className="rounded-lg border border-zinc-300 px-4 py-3 text-sm font-medium dark:border-zinc-700"
        >
          履歴を見る
        </Link>
      </div>
    </section>
  );
}
