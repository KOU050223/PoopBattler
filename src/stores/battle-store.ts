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
  applyMarkCompleting,
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
  markCompleting: () => void;
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
      markCompleting: () => set((state) => applyMarkCompleting(state)),
      setBowelDraft: (draft) => set((state) => applySetBowelDraft(state, draft)),
      reset: () => set(IDLE_BATTLE_SNAPSHOT),
    }),
    {
      name: BATTLE_STORE_NAME,
      storage: createJSONStorage(getBattleStateStorage),
      partialize: (state) => partializeBattleStore(state),
    },
  ),
);
