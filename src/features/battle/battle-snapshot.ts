import type {
  BattleCombatant,
  BattleParty,
  BattleSnapshot,
} from "./battle.types";

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
  "switchCooldownTicks",
  "elapsedTicks",
  "benchGauges",
  "startedAt",
  "bowelDraft",
] as const satisfies readonly (keyof BattleSnapshot)[];

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
  switchCooldownTicks: 0,
  elapsedTicks: 0,
  benchGauges: [0, 0, 0],
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
    switchCooldownTicks: state.switchCooldownTicks ?? 0,
    elapsedTicks: state.elapsedTicks ?? 0,
    benchGauges: state.benchGauges,
    startedAt: state.startedAt,
    bowelDraft: state.bowelDraft,
  };
}

export function cloneBattleSnapshot(state: BattleSnapshot): BattleSnapshot {
  return {
    ...partializeBattleStore(state),
    benchGauges: [...state.benchGauges] as [number, number, number],
    enemy: state.enemy ? { ...state.enemy } : null,
    party: state.party
      ? [{ ...state.party[0] }, { ...state.party[1] }, { ...state.party[2] }]
      : null,
    bowelDraft: state.bowelDraft ? { ...state.bowelDraft } : null,
  };
}

export function isFighting(
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
