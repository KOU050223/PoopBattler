"use client";

import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";

import {
  applyBeginSpecial,
  applyFireSpecial,
  applyMarkDefeated,
  applySetBowelDraft,
  applySetStance,
  applySwitchMember,
} from "@/features/battle/battle-commands";
import {
  applyBattleStart,
  applyBattleTick,
} from "@/features/battle/battle-runtime";
import {
  IDLE_BATTLE_SNAPSHOT,
  partializeBattleStore,
} from "@/features/battle/battle-snapshot";
import type { BattleStance } from "@/features/battle/battle.constants";
import type {
  BattleSnapshot,
  BattleStartInput,
  BowelDraft,
} from "@/features/battle/battle.types";

export const BATTLE_STORE_NAME = "poop-battler.battle";

// 個体ごとの HP / Power / Speed を持たせたときに 1 へ上げた（Issue #73）。
// スナップショットの形が変わったら必ず上げる。
export const BATTLE_STORE_VERSION = 1;

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export function getBattleStateStorage(): StateStorage {
  if (typeof window === "undefined") {
    return noopStorage;
  }

  return sessionStorage;
}

export type BattleStore = BattleSnapshot & {
  start: (input: BattleStartInput) => void;
  tick: (now?: number) => void;
  setStance: (stance: Exclude<BattleStance, "special">) => void;
  switchMember: (partyIndex: number) => void;
  beginSpecial: () => void;
  fireSpecial: () => void;
  restore: (snapshot: BattleSnapshot) => void;
  markDefeated: () => void;
  setBowelDraft: (draft: BowelDraft | null) => void;
  reset: () => void;
};

export const useBattleStore = create<BattleStore>()(
  persist<BattleStore, [], [], BattleSnapshot>(
    (set) => ({
      ...IDLE_BATTLE_SNAPSHOT,
      start: (input) => set(applyBattleStart(input)),
      tick: (now = Date.now()) => set((state) => applyBattleTick(state, now)),
      setStance: (stance) => set((state) => applySetStance(state, stance)),
      switchMember: (partyIndex) =>
        set((state) => applySwitchMember(state, partyIndex)),
      beginSpecial: () => set((state) => applyBeginSpecial(state)),
      fireSpecial: () => set((state) => applyFireSpecial(state)),
      restore: (snapshot) => set(partializeBattleStore(snapshot)),
      markDefeated: () => set((state) => applyMarkDefeated(state)),
      setBowelDraft: (draft) => set((state) => applySetBowelDraft(state, draft)),
      reset: () => set(IDLE_BATTLE_SNAPSHOT),
    }),
    {
      name: BATTLE_STORE_NAME,
      storage: createJSONStorage(getBattleStateStorage),
      partialize: (state) => partializeBattleStore(state),
      // 個体ステータス導入前の保存済みスナップショットには power / speed / maxHp が
      // 無い。そのまま復元すると undefined を掛けて NaN のHPになり、
      // 例外にもならず黙って壊れる。バージョンを上げて捨てる（Issue #73）。
      version: BATTLE_STORE_VERSION,
      migrate: () => IDLE_BATTLE_SNAPSHOT,
    },
  ),
);
