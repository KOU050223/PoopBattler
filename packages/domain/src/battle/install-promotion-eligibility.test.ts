import { describe, expect, it } from "vitest";

import {
  isFirstCompletedBattle,
  shouldRememberInstallPromotionEligibility,
} from "./install-promotion-eligibility";

describe("isFirstCompletedBattle", () => {
  it("確定済みバトルが1件のときだけ、初回完了として扱う", () => {
    expect(isFirstCompletedBattle(1)).toBe(true);
    expect(isFirstCompletedBattle(0)).toBe(false);
    expect(isFirstCompletedBattle(2)).toBe(false);
  });
});

describe("shouldRememberInstallPromotionEligibility", () => {
  it("初回完了後は導入イベントが遅れても案内資格を保持する", () => {
    expect(shouldRememberInstallPromotionEligibility(true, false)).toBe(true);
    expect(shouldRememberInstallPromotionEligibility(false, true)).toBe(true);
    expect(shouldRememberInstallPromotionEligibility(false, false)).toBe(false);
  });
});
