import { useEffect } from "react";
import { AppState } from "react-native";

import { tickIntervalMs, type BattleSpeed } from "@poopbattler/domain/battle/battle.constants";

import { useBattleStore } from "./battle-store";

/**
 * enabled の間だけ tick を回す。background に入ったら止め、active に戻ったら
 * 経過時間分をまとめて畳み込む（上限は MAX_CATCHUP_TICKS）。
 * inactive（通知センター等）は止めない。短時間で戻るため、止めると体感が悪い。
 */
export function useBattleTicker(enabled: boolean, speed: BattleSpeed) {
  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setInterval> | undefined;
    let backgroundedAt: number | null = null;

    const start = () => {
      timer ??= setInterval(() => useBattleStore.getState().tick(), tickIntervalMs(speed));
    };
    const stop = () => {
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
    };

    if (AppState.currentState !== "background") start();

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background") {
        backgroundedAt ??= Date.now();
        stop();
      } else if (state === "active") {
        if (backgroundedAt !== null) {
          useBattleStore.getState().catchUp(Date.now() - backgroundedAt, speed);
          backgroundedAt = null;
        }
        start();
      }
    });

    return () => {
      sub.remove();
      stop();
    };
  }, [enabled, speed]);
}
