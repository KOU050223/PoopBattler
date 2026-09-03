import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";
import { ATTRIBUTE_LABELS } from "@/features/battle/battle.constants";

import type { BattleHistoryLog } from "../actions";
import {
  BOWEL_AMOUNT_OPTIONS,
  BOWEL_COLOR_OPTIONS,
  BOWEL_EASE_OPTIONS,
  BOWEL_HARDNESS_OPTIONS,
} from "../bowel-log.types";

function formatCompletedAt(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function optionLabel<T>(options: readonly { value: T; label: string }[], value: T) {
  return options.find((option) => option.value === value)?.label ?? String(value);
}

export function BattleHistoryList({ logs }: { logs: BattleHistoryLog[] }) {
  if (logs.length === 0) {
    return (
      <EmptyState
        title="まだ記録がありません"
        description="バトルに勝って排便状態を記録すると、ここで振り返れます。"
        action={(
          <Link
            href="/battle"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            バトルへ行く
          </Link>
        )}
      />
    );
  }

  return (
    <ol className="flex flex-col gap-4" aria-label="バトルと排便の履歴">
      {logs.map((log) => (
        <li key={log.battleId} className="flex flex-col gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{log.enemy.name}とのバトル</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">確定日時: {formatCompletedAt(log.completedAt)}</p>
            </div>
            <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              完了
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-zinc-600 dark:text-zinc-400">敵の属性</dt>
              <dd>{ATTRIBUTE_LABELS[log.enemy.attribute]}</dd>
            </div>
            <div>
              <dt className="text-zinc-600 dark:text-zinc-400">仲間化</dt>
              <dd>{log.companionshipResult ? "仲間になった" : "仲間にならなかった"}</dd>
            </div>
            {log.mealTag ? (
              <div>
                <dt className="text-zinc-600 dark:text-zinc-400">食事タグ</dt>
                <dd>{log.mealTag}</dd>
              </div>
            ) : null}
          </dl>

          {log.bowelLog ? (
            <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
              <p className="mb-2 text-sm font-medium">排便の状態</p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-zinc-600 dark:text-zinc-400">硬さ</dt>
                  <dd>{optionLabel(BOWEL_HARDNESS_OPTIONS, log.bowelLog.hardness)}</dd>
                </div>
                <div>
                  <dt className="text-zinc-600 dark:text-zinc-400">量</dt>
                  <dd>{optionLabel(BOWEL_AMOUNT_OPTIONS, log.bowelLog.amount)}</dd>
                </div>
                <div>
                  <dt className="text-zinc-600 dark:text-zinc-400">色</dt>
                  <dd>{optionLabel(BOWEL_COLOR_OPTIONS, log.bowelLog.color)}</dd>
                </div>
                <div>
                  <dt className="text-zinc-600 dark:text-zinc-400">出やすさ</dt>
                  <dd>{optionLabel(BOWEL_EASE_OPTIONS, log.bowelLog.ease)}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">排便の記録を取得できませんでした。</p>
          )}
        </li>
      ))}
    </ol>
  );
}
