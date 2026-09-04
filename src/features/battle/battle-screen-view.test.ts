import { describe, expect, it } from "vitest";

import {
  OUTCOME_OVERLAY_DISMISS_LOCK_MS,
  isOutcomeOverlayDismissLocked,
  resolveBattleScreenView,
} from "./battle-screen-view";

describe("resolveBattleScreenView", () => {
  it("戦闘中は排便入力にも勝敗演出にも進まない", () => {
    expect(
      resolveBattleScreenView({
        status: "active",
        outcomeAcknowledged: false,
        hasParty: true,
        hasEnemy: true,
      }),
    ).toEqual({ kind: "fight", showOutcomeOverlay: false });
  });

  it("勝利直後は演出を出し、排便入力はまだ出さない", () => {
    const view = resolveBattleScreenView({
      status: "completing",
      outcomeAcknowledged: false,
      hasParty: true,
      hasEnemy: true,
    });
    expect(view).toEqual({ kind: "fight", showOutcomeOverlay: true });
    expect(view).not.toEqual({ kind: "completion" });
  });

  it("演出を閉じたあとは排便入力へ一度だけ進む", () => {
    expect(
      resolveBattleScreenView({
        status: "completing",
        outcomeAcknowledged: true,
        hasParty: true,
        hasEnemy: true,
      }),
    ).toEqual({ kind: "completion" });
  });

  it("敗北直後は演出を出し、終了ボタンはまだ出さない", () => {
    expect(
      resolveBattleScreenView({
        status: "defeated",
        outcomeAcknowledged: false,
        hasParty: true,
        hasEnemy: true,
      }),
    ).toEqual({ kind: "fight", showOutcomeOverlay: true });
  });
});

describe("isOutcomeOverlayDismissLocked", () => {
  it("出してすぐのタップでは閉じない", () => {
    expect(isOutcomeOverlayDismissLocked(1_000, 1_000)).toBe(true);
    expect(
      isOutcomeOverlayDismissLocked(1_000, 1_000 + OUTCOME_OVERLAY_DISMISS_LOCK_MS - 1),
    ).toBe(true);
  });

  it("ロック後は閉じられる", () => {
    expect(
      isOutcomeOverlayDismissLocked(1_000, 1_000 + OUTCOME_OVERLAY_DISMISS_LOCK_MS),
    ).toBe(false);
  });
});
