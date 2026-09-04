"use client";

import { useEffect, useRef, useState } from "react";

import {
  completeBattleAction,
  type CompleteBattleResult,
} from "@/features/battle/actions";
import { isBattleGoneMessage } from "@/features/battle/complete-battle-error";
import { BattleMealSessionList } from "@/features/battle/components/battle-meal-session-list";
import {
  mealLogIdForComplete,
  postBattleCompleteLabel,
  postBattleMealChanceCopy,
} from "@/features/battle/post-battle-meal-session";
import { BowelLogForm } from "@/features/bowel-log/components/bowel-log-form";
import type { BowelLog } from "@/features/bowel-log/bowel-log.types";
import { getMealLogsAction, saveMealLogAction, type MealLog } from "@/features/meal/actions";
import { MealLogForm } from "@/features/meal/components/meal-log-form";
import type { MealLogDraft, MealLogSaveResult } from "@/features/meal/meal.types";
import { primaryButtonClass } from "@/lib/ui-classes";

export type BattleCompletedPayload = {
  result: Extract<CompleteBattleResult, { success: true }>;
  mealPhotoId: string | null;
};

type BattleCompletionFlowProps = {
  battleId: string;
  onCompleted: (payload: BattleCompletedPayload) => void;
  onAbandon: () => void;
};

type BattleMealStepProps = {
  existingMealLogCount: number;
  sessionLogs: MealLog[];
  error: string | null;
  onSave: (draft: MealLogDraft) => Promise<MealLogSaveResult>;
  onComplete: () => void | Promise<void>;
  onAbandon: () => void;
};

/** 1枚保存してもフォームを残し、完了で次へ進む。 */
export function BattleMealStep({
  existingMealLogCount,
  sessionLogs,
  error,
  onSave,
  onComplete,
  onAbandon,
}: BattleMealStepProps) {
  return (
    <section className="flex w-full min-w-0 flex-col gap-4">
      <header className="rounded-xl bg-paper-white/70 px-3.5 py-3">
        <p className="text-[15px] font-black tracking-[-0.02em] text-charcoal">食事を記録すると、仲間になりやすくなる</p>
        <p className="mt-0.5 text-xs font-medium leading-relaxed text-pencil-gray">
          {postBattleMealChanceCopy(existingMealLogCount, sessionLogs.length)}
        </p>
      </header>
      <section aria-labelledby="post-battle-meal-entry-title" className="meal-form-section w-full min-w-0">
        <h2 id="post-battle-meal-entry-title">食事の記録</h2>
        <MealLogForm
          refreshOnSuccess={false}
          onSave={onSave}
          onSkip={onComplete}
          skipLabel={postBattleCompleteLabel(sessionLogs.length)}
        >
          <BattleMealSessionList logs={sessionLogs} />
        </MealLogForm>
      </section>
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
      {error && isBattleGoneMessage(error) ? (
        <button type="button" className={primaryButtonClass} onClick={onAbandon}>
          新しく始める
        </button>
      ) : null}
    </section>
  );
}

/**
 * 排便の次に、食事タブと同じ記録フォームを出す。
 * 記録しなくてもバトルは完了できる。仲間化確率は食事ログの件数で決まる。
 * 食事は1枚保存しても画面に止まり、完了を押すまで次へ進まない。
 */
export function BattleCompletionFlow({ battleId, onCompleted, onAbandon }: BattleCompletionFlowProps) {
  const submittingRef = useRef(false);
  const sessionMealLogIdsRef = useRef<string[]>([]);
  const lastMealPhotoIdRef = useRef<string | null>(null);
  const [bowelLog, setBowelLog] = useState<BowelLog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [existingMealLogCount, setExistingMealLogCount] = useState(0);
  const [sessionLogs, setSessionLogs] = useState<MealLog[]>([]);

  useEffect(() => {
    void getMealLogsAction().then((logs) => setExistingMealLogCount(logs.length));
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
      onCompleted({
        result,
        mealPhotoId: lastMealPhotoIdRef.current,
      });
      return result;
    } finally {
      submittingRef.current = false;
    }
  }

  async function saveMeal(draft: MealLogDraft): Promise<MealLogSaveResult> {
    const saved = await saveMealLogAction(draft);
    if (!saved.success) return saved;

    sessionMealLogIdsRef.current = [...sessionMealLogIdsRef.current, saved.mealLogId];
    lastMealPhotoIdRef.current = draft.photoId;
    setSessionLogs((current) => [
      ...current,
      {
        id: saved.mealLogId,
        eatenAt: draft.eatenAt,
        photoId: draft.photoId,
        foodGroups: draft.foodGroups,
        note: draft.note ?? null,
      },
    ]);
    return saved;
  }

  return bowelLog ? (
    <BattleMealStep
      existingMealLogCount={existingMealLogCount}
      sessionLogs={sessionLogs}
      error={error}
      onSave={saveMeal}
      onComplete={() => void finish(mealLogIdForComplete(sessionMealLogIdsRef.current))}
      onAbandon={onAbandon}
    />
  ) : (
    <section className="flex flex-col gap-4">
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
