import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

import {
  applyAcknowledgeOutcome,
  applyBeginSpecial,
  applyFireSpecial,
  applyMarkCompleting,
  applyMarkDefeated,
  applySetBowelDraft,
  applySetStance,
  applySwitchMember,
} from "@poopbattler/domain/battle/battle-commands";
import { applyBattleStart, applyBattleTick } from "@poopbattler/domain/battle/battle-runtime";
import { IDLE_BATTLE_SNAPSHOT, partializeBattleStore } from "@poopbattler/domain/battle/battle-snapshot";
import type { BattleSpeed, BattleStance } from "@poopbattler/domain/battle/battle.constants";
import type { BattleSnapshot, BattleStartInput } from "@poopbattler/domain/battle/battle.types";
import type { BowelLogDraft } from "@poopbattler/domain/records/bowel-log.types";

import { catchUpBattleTicks } from "./tick-catchup";

export const BATTLE_STORE_NAME = "poop-battler.battle";

// 個体ごとの HP / Power / Speed を持たせたときに 1 へ上げた（Issue #73）。
// スナップショットの形が変わったら必ず上げる。web と同じ値。
export const BATTLE_STORE_VERSION = 2;

// 古いスナップショットは power / speed / maxHp が無く、復元すると NaN のHPになる。捨てる。
export function migrateBattleState(): BattleSnapshot {
  return IDLE_BATTLE_SNAPSHOT;
}

export type BattleStore = BattleSnapshot & {
  start: (input: BattleStartInput) => void;
  tick: () => void;
  catchUp: (elapsedMs: number, speed: BattleSpeed) => void;
  setStance: (stance: Exclude<BattleStance, "special">) => void;
  switchMember: (partyIndex: number) => void;
  beginSpecial: (speed?: BattleSpeed) => void;
  fireSpecial: () => void;
  restore: (snapshot: BattleSnapshot) => void;
  markDefeated: () => void;
  markCompleting: () => void;
  setBowelDraft: (draft: BowelLogDraft | null) => void;
  acknowledgeOutcome: () => void;
  reset: () => void;
};

/** 保存先を差し込めるようにしてある（本番は AsyncStorage、テストはメモリ）。 */
export function createBattleStore(storage: StateStorage) {
  return create<BattleStore>()(
    persist<BattleStore, [], [], BattleSnapshot>(
      (set) => ({
        ...IDLE_BATTLE_SNAPSHOT,
        start: (input) => set(applyBattleStart(input)),
        tick: () => set((state) => applyBattleTick(state)),
        catchUp: (elapsedMs, speed) => set((state) => catchUpBattleTicks(state, elapsedMs, speed)),
        setStance: (stance) => set((state) => applySetStance(state, stance)),
        switchMember: (partyIndex) => set((state) => applySwitchMember(state, partyIndex)),
        beginSpecial: (speed) => set((state) => applyBeginSpecial(state, speed)),
        fireSpecial: () => set((state) => applyFireSpecial(state)),
        restore: (snapshot) => set(partializeBattleStore(snapshot)),
        markDefeated: () => set((state) => applyMarkDefeated(state)),
        markCompleting: () => set((state) => applyMarkCompleting(state)),
        setBowelDraft: (draft) => set((state) => applySetBowelDraft(state, draft)),
        acknowledgeOutcome: () => set((state) => applyAcknowledgeOutcome(state)),
        reset: () => set(IDLE_BATTLE_SNAPSHOT),
      }),
      {
        name: BATTLE_STORE_NAME,
        storage: createJSONStorage(() => storage),
        partialize: (state) => partializeBattleStore(state),
        version: BATTLE_STORE_VERSION,
        migrate: migrateBattleState,
      },
    ),
  );
}
