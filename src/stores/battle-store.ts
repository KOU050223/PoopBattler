"use client";

import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";

import {
  GUARD_COOLDOWN_MS,
  GUARD_DURATION_MS,
  INITIAL_ENEMY_HP,
  INITIAL_MEMBER_HP,
  PARTY_SIZE,
  PLAYER_SPECIAL_CHARGE_MS,
  SPECIAL_GAUGE_MAX,
  SPECIAL_GAUGE_PER_TICK,
  SWITCH_STUN_MS,
  TIMEOUT_MS,
  computeAttackDamage,
  msToTicks,
  type BattleStance,
} from "@/features/battle/battle.constants";
import type {
  BattleCombatant,
  BattleParty,
  BattleSnapshot,
  BattleStartInput,
  BowelDraft,
} from "@/features/battle/battle.types";

export const BATTLE_STORE_NAME = "poop-battler.battle";

export const BATTLE_SNAPSHOT_KEYS = [
  "status",
  "battleId",
  "enemy",
  "party",
  "activeIndex",
  "playerStance",
  "enemyStance",
  "playerGauge",
  "enemyGauge",
  "playerGuardRemainingTicks",
  "playerGuardCooldownTicks",
  "playerSpecialChargeTicks",
  "enemyGuardRemainingTicks",
  "enemyGuardCooldownTicks",
  "enemySpecialTelegraphTicks",
  "switchStunTicks",
  "startedAt",
  "bowelDraft",
] as const satisfies readonly (keyof BattleSnapshot)[];

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

export const IDLE_BATTLE_SNAPSHOT: BattleSnapshot = {
  status: "idle",
  battleId: null,
  enemy: null,
  party: null,
  activeIndex: 0,
  playerStance: "fight",
  enemyStance: "fight",
  playerGauge: 0,
  enemyGauge: 0,
  playerGuardRemainingTicks: 0,
  playerGuardCooldownTicks: 0,
  playerSpecialChargeTicks: 0,
  enemyGuardRemainingTicks: 0,
  enemyGuardCooldownTicks: 0,
  enemySpecialTelegraphTicks: 0,
  switchStunTicks: 0,
  startedAt: null,
  bowelDraft: null,
};

export function partializeBattleStore(state: BattleSnapshot): BattleSnapshot {
  return {
    status: state.status,
    battleId: state.battleId,
    enemy: state.enemy,
    party: state.party,
    activeIndex: state.activeIndex,
    playerStance: state.playerStance,
    enemyStance: state.enemyStance,
    playerGauge: state.playerGauge,
    enemyGauge: state.enemyGauge,
    playerGuardRemainingTicks: state.playerGuardRemainingTicks,
    playerGuardCooldownTicks: state.playerGuardCooldownTicks,
    playerSpecialChargeTicks: state.playerSpecialChargeTicks,
    enemyGuardRemainingTicks: state.enemyGuardRemainingTicks,
    enemyGuardCooldownTicks: state.enemyGuardCooldownTicks,
    enemySpecialTelegraphTicks: state.enemySpecialTelegraphTicks,
    switchStunTicks: state.switchStunTicks,
    startedAt: state.startedAt,
    bowelDraft: state.bowelDraft,
  };
}

function cloneSnapshot(state: BattleSnapshot): BattleSnapshot {
  return {
    ...partializeBattleStore(state),
    enemy: state.enemy ? { ...state.enemy } : null,
    party: state.party
      ? [{ ...state.party[0] }, { ...state.party[1] }, { ...state.party[2] }]
      : null,
    bowelDraft: state.bowelDraft ? { ...state.bowelDraft } : null,
  };
}

function isFighting(
  state: BattleSnapshot,
): state is BattleSnapshot & {
  party: BattleParty;
  enemy: BattleCombatant;
  startedAt: number;
} {
  return (
    state.status === "active" &&
    state.party !== null &&
    state.enemy !== null &&
    state.startedAt !== null
  );
}

function nextLivingIndex(
  party: BattleParty,
  activeIndex: number,
): number | null {
  for (let step = 1; step < PARTY_SIZE; step += 1) {
    const index = (activeIndex + step) % PARTY_SIZE;
    if (party[index].hp > 0) {
      return index;
    }
  }

  return null;
}

function resolveByRemainingHp(state: BattleSnapshot): BattleSnapshot {
  if (!state.party || !state.enemy) {
    return { ...state, status: "defeated" };
  }

  const partyHp = state.party.reduce((sum, member) => sum + member.hp, 0);

  return {
    ...state,
    status: partyHp >= state.enemy.hp ? "completing" : "defeated",
    playerStance: "fight",
    enemyStance: "fight",
    playerSpecialChargeTicks: 0,
    enemySpecialTelegraphTicks: 0,
  };
}

function applyKnockout(state: BattleSnapshot): BattleSnapshot {
  if (!isFighting(state)) {
    return state;
  }

  if (state.enemy.hp <= 0) {
    return {
      ...state,
      enemy: { ...state.enemy, hp: 0 },
      status: "completing",
      playerStance: "fight",
      enemyStance: "fight",
      playerSpecialChargeTicks: 0,
      enemySpecialTelegraphTicks: 0,
    };
  }

  if (state.party[state.activeIndex].hp > 0) {
    return state;
  }

  const nextIndex = nextLivingIndex(state.party, state.activeIndex);
  if (nextIndex === null) {
    return {
      ...state,
      status: "defeated",
      playerStance: "fight",
      playerSpecialChargeTicks: 0,
    };
  }

  return {
    ...state,
    activeIndex: nextIndex,
    switchStunTicks: msToTicks(SWITCH_STUN_MS),
    playerGauge: 0,
    playerStance: "fight",
    playerSpecialChargeTicks: 0,
    playerGuardRemainingTicks: 0,
  };
}

function dealDamage(
  state: BattleSnapshot,
  source: "player" | "enemy",
  isSpecial: boolean,
): BattleSnapshot {
  if (!isFighting(state)) {
    return state;
  }

  const next = cloneSnapshot(state);
  if (!next.party || !next.enemy) {
    return next;
  }

  const member = next.party[next.activeIndex];

  if (source === "player") {
    next.enemy.hp = Math.max(
      0,
      next.enemy.hp -
        computeAttackDamage({
          attackerAttribute: member.attribute,
          defenderAttribute: next.enemy.attribute,
          attackerStance: isSpecial ? "fight" : next.playerStance,
          defenderStance: next.enemyStance,
          isSpecial,
        }),
    );
  } else {
    member.hp = Math.max(
      0,
      member.hp -
        computeAttackDamage({
          attackerAttribute: next.enemy.attribute,
          defenderAttribute: member.attribute,
          attackerStance: isSpecial ? "fight" : next.enemyStance,
          defenderStance: next.playerStance,
          isSpecial,
        }),
    );
  }

  return applyKnockout(next);
}

function decrementGuard(
  stance: BattleStance,
  remaining: number,
  cooldown: number,
): { stance: BattleStance; remaining: number; cooldown: number } {
  if (stance === "guard") {
    const nextRemaining = remaining - 1;
    if (nextRemaining <= 0) {
      return {
        stance: "fight",
        remaining: 0,
        cooldown: msToTicks(GUARD_COOLDOWN_MS),
      };
    }

    return { stance, remaining: nextRemaining, cooldown };
  }

  return {
    stance,
    remaining: 0,
    cooldown: Math.max(0, cooldown - 1),
  };
}

export function applyBattleStart(input: BattleStartInput): BattleSnapshot {
  return {
    ...IDLE_BATTLE_SNAPSHOT,
    status: "active",
    battleId: input.battleId,
    enemy: {
      characterId: input.enemy.characterId,
      attribute: input.enemy.attribute,
      hp: INITIAL_ENEMY_HP,
    },
    party: [
      { ...input.party[0], hp: INITIAL_MEMBER_HP },
      { ...input.party[1], hp: INITIAL_MEMBER_HP },
      { ...input.party[2], hp: INITIAL_MEMBER_HP },
    ],
    activeIndex: 0,
    startedAt: input.now ?? Date.now(),
  };
}

export function applyBattleTick(
  state: BattleSnapshot,
  now: number,
): BattleSnapshot {
  if (!isFighting(state)) {
    return state;
  }

  if (now - state.startedAt >= TIMEOUT_MS) {
    return resolveByRemainingHp(cloneSnapshot(state));
  }

  let next = cloneSnapshot(state);

  if (next.switchStunTicks === 0 && next.playerStance === "fight") {
    next = dealDamage(next, "player", false);
    if (next.status !== "active") {
      return next;
    }
  }

  const activeIndexBeforeEnemy = next.activeIndex;
  if (next.enemyStance === "fight") {
    next = dealDamage(next, "enemy", false);
    if (next.status !== "active") {
      return next;
    }
    // 交代硬直を同じ tick で減らし始めない。ゲージも空のままにする。
    if (next.activeIndex !== activeIndexBeforeEnemy) {
      return next;
    }
  } else if (next.enemyStance === "special") {
    const remaining = next.enemySpecialTelegraphTicks - 1;
    if (remaining <= 0) {
      next = dealDamage(next, "enemy", true);
      next = {
        ...next,
        enemyStance: "fight",
        enemyGauge: 0,
        enemySpecialTelegraphTicks: 0,
      };
      if (next.status !== "active") {
        return next;
      }
      if (next.activeIndex !== activeIndexBeforeEnemy) {
        return next;
      }
    } else {
      next.enemySpecialTelegraphTicks = remaining;
    }
  }

  next.playerGauge = Math.min(
    SPECIAL_GAUGE_MAX,
    next.playerGauge + SPECIAL_GAUGE_PER_TICK,
  );
  next.enemyGauge = Math.min(
    SPECIAL_GAUGE_MAX,
    next.enemyGauge + SPECIAL_GAUGE_PER_TICK,
  );

  next.switchStunTicks = Math.max(0, next.switchStunTicks - 1);

  const playerGuard = decrementGuard(
    next.playerStance,
    next.playerGuardRemainingTicks,
    next.playerGuardCooldownTicks,
  );
  next.playerStance = playerGuard.stance;
  next.playerGuardRemainingTicks = playerGuard.remaining;
  next.playerGuardCooldownTicks = playerGuard.cooldown;

  const enemyGuard = decrementGuard(
    next.enemyStance,
    next.enemyGuardRemainingTicks,
    next.enemyGuardCooldownTicks,
  );
  next.enemyStance = enemyGuard.stance;
  next.enemyGuardRemainingTicks = enemyGuard.remaining;
  next.enemyGuardCooldownTicks = enemyGuard.cooldown;

  if (next.playerStance === "special") {
    next.playerSpecialChargeTicks -= 1;
    if (next.playerSpecialChargeTicks <= 0) {
      next.playerStance = "fight";
      next.playerSpecialChargeTicks = 0;
    }
  }

  return next;
}

export function applySetStance(
  state: BattleSnapshot,
  stance: Exclude<BattleStance, "special">,
): BattleSnapshot {
  if (!isFighting(state) || state.switchStunTicks > 0) {
    return state;
  }

  if (stance === "guard") {
    if (state.playerGuardCooldownTicks > 0 || state.playerStance === "guard") {
      return state;
    }

    const next = cloneSnapshot(state);
    next.playerStance = "guard";
    next.playerGuardRemainingTicks = msToTicks(GUARD_DURATION_MS);
    next.playerSpecialChargeTicks = 0;
    return next;
  }

  const next = cloneSnapshot(state);
  if (next.playerStance === "guard") {
    next.playerGuardCooldownTicks = msToTicks(GUARD_COOLDOWN_MS);
    next.playerGuardRemainingTicks = 0;
  }
  next.playerStance = "fight";
  next.playerSpecialChargeTicks = 0;
  return next;
}

export function applySwitchMember(
  state: BattleSnapshot,
  partyIndex: number,
): BattleSnapshot {
  if (!isFighting(state) || state.switchStunTicks > 0) {
    return state;
  }

  if (
    partyIndex === state.activeIndex ||
    partyIndex < 0 ||
    partyIndex >= PARTY_SIZE ||
    state.party[partyIndex].hp <= 0
  ) {
    return state;
  }

  const next = cloneSnapshot(state);
  next.activeIndex = partyIndex;
  next.switchStunTicks = msToTicks(SWITCH_STUN_MS);
  next.playerGauge = 0;
  next.playerSpecialChargeTicks = 0;
  next.playerGuardRemainingTicks = 0;
  if (next.playerStance === "guard") {
    next.playerGuardCooldownTicks = msToTicks(GUARD_COOLDOWN_MS);
  }
  next.playerStance = "fight";
  return next;
}

export function applyBeginSpecial(state: BattleSnapshot): BattleSnapshot {
  if (
    !isFighting(state) ||
    state.switchStunTicks > 0 ||
    state.playerGauge < SPECIAL_GAUGE_MAX ||
    state.playerStance === "special"
  ) {
    return state;
  }

  const next = cloneSnapshot(state);
  if (next.playerStance === "guard") {
    next.playerGuardCooldownTicks = msToTicks(GUARD_COOLDOWN_MS);
    next.playerGuardRemainingTicks = 0;
  }
  next.playerStance = "special";
  next.playerSpecialChargeTicks = msToTicks(PLAYER_SPECIAL_CHARGE_MS);
  return next;
}

export function applyFireSpecial(state: BattleSnapshot): BattleSnapshot {
  if (
    !isFighting(state) ||
    state.switchStunTicks > 0 ||
    state.playerStance !== "special" ||
    state.playerSpecialChargeTicks <= 0
  ) {
    return state;
  }

  const next = dealDamage(state, "player", true);
  return {
    ...next,
    playerGauge: 0,
    playerStance: "fight",
    playerSpecialChargeTicks: 0,
  };
}

export function applyMarkDefeated(state: BattleSnapshot): BattleSnapshot {
  if (state.status === "idle") {
    return state;
  }

  return { ...state, status: "defeated" };
}

export function applySetBowelDraft(
  state: BattleSnapshot,
  draft: BowelDraft | null,
): BattleSnapshot {
  return {
    ...state,
    bowelDraft: draft === null ? null : { ...draft },
  };
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
    },
  ),
);
