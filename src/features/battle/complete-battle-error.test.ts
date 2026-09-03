import { describe, expect, it } from "vitest";

import {
  BATTLE_GONE_MESSAGE,
  isBattleGoneMessage,
  messageForCompleteBattleError,
} from "./complete-battle-error";

describe("messageForCompleteBattleError", () => {
  it("存在しない・他人のバトルはやり直す案内にする", () => {
    expect(messageForCompleteBattleError({ code: "42501", message: "battle cannot be completed" })).toBe(
      BATTLE_GONE_MESSAGE,
    );
    expect(isBattleGoneMessage(BATTLE_GONE_MESSAGE)).toBe(true);
  });

  it("食事ログと排便の拒否を、汎用失敗に潰さない", () => {
    expect(messageForCompleteBattleError({ message: "meal log cannot be used" })).toContain("食事写真");
    expect(messageForCompleteBattleError({ message: "invalid bowel log values" })).toContain("排便");
    expect(messageForCompleteBattleError(null)).toBe("バトルの完了に失敗しました。もう一度お試しください。");
  });
});
