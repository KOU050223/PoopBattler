"use client";

import { useRef, useState } from "react";

import {
  completeBattleAction,
  type CompleteBattleResult,
} from "@/features/battle/actions";
import { isBattleGoneMessage } from "@/features/battle/complete-battle-error";
import {
  COMPANIONSHIP_PHOTO_CAP,
  companionshipChancePercent,
} from "@/features/battle/companionship-chance";
import { BowelLogForm } from "@/features/bowel-log/components/bowel-log-form";
import type { BowelLog } from "@/features/bowel-log/bowel-log.types";
import { saveMealLogAction } from "@/features/meal/actions";
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
 * 記録しなくてもバトルは完了できる。
 */
export function BattleCompletionFlow({ battleId, onCompleted, onAbandon }: BattleCompletionFlowProps) {
  const submittingRef = useRef(false);
  const savedMealLogIdsRef = useRef<string[]>([]);
  const [bowelLog, setBowelLog] = useState<BowelLog | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function finish(mealLogIds: string[]) {
    if (!bowelLog || submittingRef.current) {
      return { success: false as const, message: "記録を続けられませんでした。もう一度お試しください。" };
    }

    submittingRef.current = true;
    setError(null);

    try {
      const result = await completeBattleAction({
        battleId,
        bowelLog,
        mealLogId: mealLogIds[0] ?? null,
        mealLogIds,
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
    const photoIds = draft.photoIds && draft.photoIds.length > 0 ? draft.photoIds : [draft.photoId];
    const savedIds = savedMealLogIdsRef.current;

    while (savedIds.length < photoIds.length) {
      const saved = await saveMealLogAction({
        ...draft,
        photoId: photoIds[savedIds.length]!,
        photoIds: undefined,
      });
      if (!saved.success) return saved;
      savedIds.push(saved.mealLogId);
    }

    const completed = await finish(savedIds);
    if (!completed.success) {
      return { success: false, message: completed.message };
    }
    return { success: true, mealLogId: savedIds[0]! };
  }

  return bowelLog ? (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1 text-center">
        <p className="text-xl font-bold">食事の記録</p>
        <p className={`text-sm ${mutedTextClass}`}>
          写真を増やすと仲間になる確率が上がります。1枚25%、最大4枚で100%です。記録しなくてもバトルは完了できます。
        </p>
      </div>
      <MealLogForm
        autoOpenPicker
        maxPhotos={COMPANIONSHIP_PHOTO_CAP}
        photoCountHint={(photoCount) =>
          photoCount === 0
            ? "写真がないと仲間になりません。1枚で25%、4枚で100%です。"
            : `写真${photoCount}枚 / 仲間になる確率 ${companionshipChancePercent(photoCount)}%`
        }
        refreshOnSuccess={false}
        onSave={saveMealAndComplete}
        onSkip={() => void finish([])}
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
