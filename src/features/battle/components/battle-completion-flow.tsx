"use client";

import { useEffect, useRef, useState } from "react";

import {
  completeBattleAction,
  type CompleteBattleResult,
} from "@/features/battle/actions";
import { isBattleGoneMessage } from "@/features/battle/complete-battle-error";
import {
  COMPANIONSHIP_MEAL_LOG_CAP,
  companionshipChancePercent,
} from "@/features/battle/companionship-chance";
import { BowelLogForm } from "@/features/bowel-log/components/bowel-log-form";
import type { BowelLog } from "@/features/bowel-log/bowel-log.types";
import { getMealLogsAction, saveMealLogAction } from "@/features/meal/actions";
import { MealLogForm } from "@/features/meal/components/meal-log-form";
import type { MealLogDraft, MealLogSaveResult } from "@/features/meal/meal.types";
import { mutedTextClass, primaryButtonClass } from "@/lib/ui-classes";

type BattleCompletionFlowProps = {
  battleId: string;
  onCompleted: (result: Extract<CompleteBattleResult, { success: true }>) => void;
  onAbandon: () => void;
};

/**
 * 排便の次に、食事タブと同じ記録フォームを出す。
 * 記録しなくてもバトルは完了できる。仲間化確率は食事ログの件数で決まる。
 */
export function BattleCompletionFlow({ battleId, onCompleted, onAbandon }: BattleCompletionFlowProps) {
  const submittingRef = useRef(false);
  const savedMealLogIdRef = useRef<string | null>(null);
  const [bowelLog, setBowelLog] = useState<BowelLog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mealLogCount, setMealLogCount] = useState(0);

  useEffect(() => {
    void getMealLogsAction().then((logs) => setMealLogCount(logs.length));
  }, []);

  async function finish(mealLogId: string | null) {
    if (!bowelLog || submittingRef.current) {
      return { success: false as const, message: "記録を続けられませんでした。もう一度お試しください。" };
    }

    submittingRef.current = true;
    setError(null);

    try {
      const result = await completeBattleAction({
        battleId,
        bowelLog,
        mealLogId,
      });
      if (!result.success) {
        setError(result.message);
        return result;
      }
      onCompleted(result);
      return result;
    } finally {
      submittingRef.current = false;
    }
  }

  async function saveMealAndComplete(draft: MealLogDraft): Promise<MealLogSaveResult> {
    let mealLogId = savedMealLogIdRef.current;
    if (!mealLogId) {
      const saved = await saveMealLogAction(draft);
      if (!saved.success) return saved;
      mealLogId = saved.mealLogId;
      savedMealLogIdRef.current = mealLogId;
    }

    const completed = await finish(mealLogId);
    if (!completed.success) {
      return { success: false, message: completed.message };
    }
    return { success: true, mealLogId };
  }

  const skipChance = companionshipChancePercent(mealLogCount);
  const saveChance = companionshipChancePercent(mealLogCount + 1);

  return bowelLog ? (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1 text-center">
        <p className="text-xl font-bold">食事の記録</p>
        <p className={`text-sm ${mutedTextClass}`}>
          {mealLogCount === 0
            ? `食事ログがないと仲間になりません。今回記録すると25%、${COMPANIONSHIP_MEAL_LOG_CAP}件で100%です。記録しなくてもバトルは完了できます。`
            : `いま食事ログは${mealLogCount}件です。記録せずに完了すると${skipChance}%、今回記録すると${saveChance}%です。`}
        </p>
      </div>
      <MealLogForm
        autoOpenPicker
        refreshOnSuccess={false}
        onSave={saveMealAndComplete}
        onSkip={() => void finish(null)}
        skipLabel="記録せずに完了する"
      />
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
      {error && isBattleGoneMessage(error) ? (
        <button type="button" className={primaryButtonClass} onClick={onAbandon}>
          新しく始める
        </button>
      ) : null}
    </section>
  ) : (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1 text-center">
        <p className="text-xl font-bold">勝利！</p>
        <p className={`text-sm ${mutedTextClass}`}>
          排便の状態を記録したあと、食事の記録が開きます。食事は任意です。
        </p>
      </div>
      <BowelLogForm onSubmit={(log) => {
        setBowelLog(log);
        setError(null);
      }} />
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
      {error && isBattleGoneMessage(error) ? (
        <button type="button" className={primaryButtonClass} onClick={onAbandon}>
          新しく始める
        </button>
      ) : null}
    </section>
  );
}
