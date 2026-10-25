import { useSyncExternalStore } from "react";

import { battleRenderModeCache } from "./battle-render-mode-cache";
import {
  DEFAULT_BATTLE_RENDER_MODE,
  readBattleRenderMode,
  subscribeBattleRenderMode,
  writeBattleRenderMode,
  type BattleRenderMode,
} from "./battle-render-mode-storage";

/** 描画モードの購読。呼び出し側は battleRenderModeCache.load() 完了後に使う。 */
export function useBattleRenderMode(): [BattleRenderMode, () => void] {
  const mode = useSyncExternalStore(
    subscribeBattleRenderMode,
    () => readBattleRenderMode(battleRenderModeCache.storage),
    () => DEFAULT_BATTLE_RENDER_MODE,
  );
  return [mode, () => writeBattleRenderMode(battleRenderModeCache.storage, mode === "3d" ? "2d" : "3d")];
}
