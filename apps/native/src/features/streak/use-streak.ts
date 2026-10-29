import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { battleHistoryGateway } from "@/gateways";
import type { BattleHistoryLog } from "@/features/bowel-log/battle-history-gateway";

import { calcStreak, type StreakResult } from "./calc-streak";

// 取得に失敗してもホームは出したいので、失敗時はこの値で表示する。
export const EMPTY_STREAK: StreakResult = { streakDays: 0, todayCount: 0 };

/** うんちの記録（bowelLog）がついたバトルだけを、記録した日時として取り出す。 */
export function toLoggedAtList(history: readonly BattleHistoryLog[]): string[] {
  return history.flatMap((battle) => (battle.bowelLog ? [battle.completedAt] : []));
}

/** 画面に戻るたびに数え直す（バトル後の記録がホームへすぐ反映されるように）。 */
export function useStreak(): StreakResult {
  const [streak, setStreak] = useState<StreakResult>(EMPTY_STREAK);

  useFocusEffect(
    useCallback(() => {
      let isCancelled = false;
      battleHistoryGateway()
        .getBattleHistory()
        .then((history) => {
          if (!isCancelled) setStreak(calcStreak(toLoggedAtList(history)));
        })
        .catch(() => {
          if (!isCancelled) setStreak(EMPTY_STREAK);
        });
      return () => {
        isCancelled = true;
      };
    }, []),
  );

  return streak;
}
