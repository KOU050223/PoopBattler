export const BATTLE_GONE_MESSAGE =
  "このバトルはもう進められません。新しく始めてください。";

const GENERIC_COMPLETE_MESSAGE =
  "バトルの完了に失敗しました。もう一度お試しください。";

/** complete_battle RPC の失敗を、画面向けの一文にする。 */
export function messageForCompleteBattleError(
  error: { code?: string; message?: string } | null,
): string {
  if (!error) return GENERIC_COMPLETE_MESSAGE;

  const text = `${error.code ?? ""} ${error.message ?? ""}`;
  if (error.code === "42501" || /battle cannot be completed/i.test(text)) {
    return BATTLE_GONE_MESSAGE;
  }
  if (/meal log cannot be used/i.test(text)) {
    return "この食事写真は使えません。選び直すか、写真なしで完了してください。";
  }
  if (/meal log cannot be changed/i.test(text)) {
    return "一度選んだ食事写真は変更できません。";
  }
  if (/invalid bowel/i.test(text)) {
    return "排便の入力内容を確認してください。";
  }

  return GENERIC_COMPLETE_MESSAGE;
}

export function isBattleGoneMessage(message: string) {
  return message === BATTLE_GONE_MESSAGE;
}
