import Link from "next/link";
import { CheckCircle2, Swords, UserRoundPlus } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { ATTRIBUTE_LABELS } from "@/features/battle/battle.constants";
import { getMealFoodGroupLabel } from "@/features/meal/meal.types";

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
    <ol className="flex flex-col gap-3" aria-label="バトルと排便の履歴">
      {logs.map((log) => (
        <li key={log.battleId} className="battle-report-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Swords aria-hidden="true" className="size-[18px] text-flush-edge" />
                <h2>{log.enemy.name}とのバトル</h2>
              </div>
              <p className="battle-report-date">{formatCompletedAt(log.completedAt)}</p>
            </div>
            <span className="battle-report-complete"><CheckCircle2 aria-hidden="true" className="size-3.5" />記録済み</span>
          </div>

          <div className="battle-report-meta">
            <span className="battle-report-attribute">属性: {ATTRIBUTE_LABELS[log.enemy.attribute]}</span>
            <span className={`battle-report-companion ${log.companionshipResult ? "battle-report-companion-success" : ""}`}>
              <UserRoundPlus aria-hidden="true" className="size-3.5" />{log.companionshipResult ? "仲間になった" : "仲間にならなかった"}
            </span>
            {log.mealFoodGroups ? <span className="battle-report-meal">きっかけ: {log.mealFoodGroups.map(getMealFoodGroupLabel).join("・")}</span> : null}
          </div>

          {log.bowelLog ? (
            <section className="battle-condition" aria-label="排便コンディション">
              <h3>排便コンディション</h3>
              <dl>
                <div><dt>硬さ</dt><dd>{optionLabel(BOWEL_HARDNESS_OPTIONS, log.bowelLog.hardness)}</dd></div>
                <div><dt>量</dt><dd>{optionLabel(BOWEL_AMOUNT_OPTIONS, log.bowelLog.amount)}</dd></div>
                <div><dt>色</dt><dd>{optionLabel(BOWEL_COLOR_OPTIONS, log.bowelLog.color)}</dd></div>
                <div><dt>出やすさ</dt><dd>{optionLabel(BOWEL_EASE_OPTIONS, log.bowelLog.ease)}</dd></div>
              </dl>
            </section>
          ) : (
            <p className="battle-condition-missing">排便コンディションは記録されていません。</p>
          )}
        </li>
      ))}
    </ol>
  );
}
