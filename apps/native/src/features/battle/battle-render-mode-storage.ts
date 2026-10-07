import type { SyncKeyValueStorage } from "@poopbattler/domain/ports";

export const BATTLE_RENDER_MODE_STORAGE_KEY = "poop-battler.battle-render-mode";

export type BattleRenderMode = "2d" | "3d";
export const DEFAULT_BATTLE_RENDER_MODE: BattleRenderMode = "3d";

const listeners = new Set<() => void>();

export function subscribeBattleRenderMode(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function readBattleRenderMode(storage: Pick<SyncKeyValueStorage, "getItem"> | null): BattleRenderMode {
  const value = storage?.getItem(BATTLE_RENDER_MODE_STORAGE_KEY);
  return value === "2d" || value === "3d" ? value : DEFAULT_BATTLE_RENDER_MODE;
}

export function writeBattleRenderMode(storage: Pick<SyncKeyValueStorage, "setItem">, mode: BattleRenderMode) {
  storage.setItem(BATTLE_RENDER_MODE_STORAGE_KEY, mode);
  listeners.forEach((listener) => listener());
}
