import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";

import { keyValueStorage } from "@/adapters/storage";
import { battleHistoryGateway } from "@/gateways";
import { toLoggedAtList } from "@/features/streak/use-streak";

import { STONE_GAIN_PARAM } from "./debug-stones";
import { claimStones } from "./gacha-state";
import { readGachaState, writeGachaState } from "./gacha-storage";

export type StoneClaim = {
  stones: number;
  /** 今回もらえた石の数。0 のときは演出を出さない。 */
  gained: number;
  /** 演出を見せ終わったら呼ぶ。同じ演出を戻るたびに繰り返さない。 */
  acknowledge: () => void;
};

/**
 * ホームを開いたとき、前日までの記録分の石を受け取る。ガチャ画面を開く前にここで渡して、
 * 「もらえた」ことをホームで見せる（受け取りは lastClaimedDay で冪等なので、ガチャ側と二重にはならない）。
 */
export function useStoneClaim(): StoneClaim {
  const params = useLocalSearchParams<{ [STONE_GAIN_PARAM]?: string }>();
  const debugGain = Number(params[STONE_GAIN_PARAM]) || 0;
  const [stones, setStones] = useState(0);
  const [claimedGain, setClaimedGain] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let isCancelled = false;
      (async () => {
        const stored = await readGachaState(keyValueStorage);
        // 記録の取得に失敗しても、手持ちの石の表示は出す。
        const history = await battleHistoryGateway().getBattleHistory().catch(() => []);
        const claimed = claimStones(stored, toLoggedAtList(history), new Date());
        if (claimed.stones !== stored.stones || claimed.lastClaimedDay !== stored.lastClaimedDay) {
          await writeGachaState(keyValueStorage, claimed);
        }
        if (isCancelled) return;
        setStones(claimed.stones);
        setClaimedGain(claimed.stones - stored.stones);
      })().catch((error: unknown) => {
        console.warn("石の受け取りに失敗:", error);
      });
      return () => {
        isCancelled = true;
      };
    }, []),
  );

  const acknowledge = useCallback(() => {
    setClaimedGain(0);
    if (debugGain > 0) router.setParams({ [STONE_GAIN_PARAM]: undefined });
  }, [debugGain]);

  return { stones, gained: claimedGain + debugGain, acknowledge };
}
