import {
  GUARD_DURATION_MS,
  PARTY_SIZE,
  SPECIAL_GAUGE_MAX,
  SWITCH_COOLDOWN_TICKS,
  SWITCH_STUN_MS,
  guardCooldownTicks,
  msToTicks,
  specialChargeTicks,
  type BattleSpeed,
  type BattleStance,
} from "./battle.constants";
import { dealDamage } from "./battle-runtime";
import { cloneBattleSnapshot, isFighting } from "./battle-snapshot";
import type { BattleSnapshot, BowelDraft } from "./battle.types";

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

    const next = cloneBattleSnapshot(state);
    next.playerStance = "guard";
    next.playerGuardRemainingTicks = msToTicks(GUARD_DURATION_MS);
    next.playerSpecialChargeTicks = 0;
    return next;
  }

  const next = cloneBattleSnapshot(state);
  if (next.playerStance === "guard") {
    next.playerGuardCooldownTicks = guardCooldownTicks(
      state.party[state.activeIndex].speed,
    );
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
  if (
    !isFighting(state) ||
    state.switchStunTicks > 0 ||
    state.switchCooldownTicks > 0
  ) {
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

  const next = cloneBattleSnapshot(state);
  const guardCooldown = guardCooldownTicks(state.party[state.activeIndex].speed);
  next.activeIndex = partyIndex;
  next.switchStunTicks = msToTicks(SWITCH_STUN_MS);
  next.switchCooldownTicks = SWITCH_COOLDOWN_TICKS;
  // 必殺ゲージは場でだけ溜まる。交代で退場側も入場側も空にする。
  next.playerGauge = 0;
  next.benchGauges = [0, 0, 0];
  next.playerSpecialChargeTicks = 0;
  next.playerGuardRemainingTicks = 0;
  if (next.playerStance === "guard") {
    next.playerGuardCooldownTicks = guardCooldown;
  }
  next.playerStance = "fight";
  return next;
}

export function applyBeginSpecial(
  state: BattleSnapshot,
  speed: BattleSpeed = 1,
): BattleSnapshot {
  if (
    !isFighting(state) ||
    state.switchStunTicks > 0 ||
    state.playerGauge < SPECIAL_GAUGE_MAX ||
    state.playerStance === "special"
  ) {
    return state;
  }

  const next = cloneBattleSnapshot(state);
  if (next.playerStance === "guard") {
    next.playerGuardCooldownTicks = guardCooldownTicks(
      state.party[state.activeIndex].speed,
    );
    next.playerGuardRemainingTicks = 0;
  }
  next.playerStance = "special";
  next.playerSpecialChargeTicks = specialChargeTicks(speed);
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

  return { ...state, status: "defeated", outcomeAcknowledged: false };
}

export function applyMarkCompleting(state: BattleSnapshot): BattleSnapshot {
  if (!isFighting(state)) {
    return state;
  }

  const next = cloneBattleSnapshot(state);
  if (!next.enemy) {
    return state;
  }

  next.enemy.hp = 0;
  next.status = "completing";
  next.outcomeAcknowledged = false;
  next.playerStance = "fight";
  next.enemyStance = "fight";
  next.playerSpecialChargeTicks = 0;
  next.enemySpecialTelegraphTicks = 0;
  return next;
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

export function applyAcknowledgeOutcome(state: BattleSnapshot): BattleSnapshot {
  if (state.status !== "completing" && state.status !== "defeated") {
    return state;
  }

  if (state.outcomeAcknowledged) {
    return state;
  }

  return { ...state, outcomeAcknowledged: true };
}
