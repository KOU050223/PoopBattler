import type { BattleStatus } from "./battle.types";

export const OUTCOME_OVERLAY_DISMISS_LOCK_MS = 500;

export type BattleScreenView =
  | { kind: "completion" }
  | { kind: "defeat" }
  | { kind: "fight"; showOutcomeOverlay: boolean }
  | { kind: "outcome-only" }
  | { kind: "other" };

export function isOutcomeOverlayDismissLocked(
  shownAtMs: number,
  nowMs: number,
): boolean {
  return nowMs - shownAtMs < OUTCOME_OVERLAY_DISMISS_LOCK_MS;
}

export function isAwaitingOutcomeAck(
  status: BattleStatus,
  outcomeAcknowledged: boolean,
): boolean {
  return (status === "completing" || status === "defeated") && !outcomeAcknowledged;
}

export function resolveBattleScreenView(input: {
  status: BattleStatus;
  outcomeAcknowledged: boolean;
  hasParty: boolean;
  hasEnemy: boolean;
}): BattleScreenView {
  const awaitingOutcomeAck = isAwaitingOutcomeAck(
    input.status,
    input.outcomeAcknowledged,
  );

  if (input.status === "completing" && input.hasEnemy && !awaitingOutcomeAck) {
    return { kind: "completion" };
  }

  if (input.status === "defeated" && input.hasEnemy && !awaitingOutcomeAck) {
    return { kind: "defeat" };
  }

  if (
    (input.status === "active" || awaitingOutcomeAck) &&
    input.hasParty &&
    input.hasEnemy
  ) {
    return { kind: "fight", showOutcomeOverlay: awaitingOutcomeAck };
  }

  if (awaitingOutcomeAck) {
    return { kind: "outcome-only" };
  }

  return { kind: "other" };
}
