import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

import { keyValueStorage } from "@/adapters/storage";
import { battleHistoryGateway } from "@/gateways";
import { toLoggedAtList } from "@/features/streak/use-streak";

import { claimStones, pullGacha, EMPTY_GACHA_STATE, type GachaState, type PullResult } from "./gacha-state";
import { readGachaState, writeGachaState } from "./gacha-storage";

export type UseGacha = {
  state: GachaState;
  isReady: boolean;
  /** 石が足りなければ insufficient。結果は保存してから返す（演出中にアプリが落ちても石が戻らない）。 */
  pull: () => Promise<PullResult>;
};

export function useGacha(): UseGacha {
  const [state, setState] = useState<GachaState>(EMPTY_GACHA_STATE);
  const [isReady, setIsReady] = useState(false);
  // 連打で同じ石を二重に使わないよう、最新の状態は ref から読む。
  const stateRef = useRef(state);
  const isPulling = useRef(false);

  const commit = useCallback((next: GachaState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isCancelled = false;
      (async () => {
        const stored = await readGachaState(keyValueStorage);
        // 記録の取得に失敗しても、手持ちの石でガチャは回せるようにする。
        const history = await battleHistoryGateway().getBattleHistory().catch(() => []);
        const claimed = claimStones(stored, toLoggedAtList(history), new Date());
        if (claimed !== stored) await writeGachaState(keyValueStorage, claimed);
        if (isCancelled) return;
        commit(claimed);
        setIsReady(true);
      })().catch((error: unknown) => {
        console.warn("ガチャの読み込みに失敗:", error);
        if (!isCancelled) setIsReady(true);
      });
      return () => {
        isCancelled = true;
      };
    }, [commit]),
  );

  const pull = useCallback(async (): Promise<PullResult> => {
    if (isPulling.current) return { status: "insufficient" };
    isPulling.current = true;
    try {
      const result = pullGacha(stateRef.current, Math.random);
      if (result.status === "ok") {
        await writeGachaState(keyValueStorage, result.state);
        commit(result.state);
      }
      return result;
    } finally {
      isPulling.current = false;
    }
  }, [commit]);

  return { state, isReady, pull };
}
