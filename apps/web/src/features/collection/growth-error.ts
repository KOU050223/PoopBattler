// merge_characters / evolve_character が返す SQLSTATE を、利用者向けの文言へ変える。
// 独自コードの定義は supabase/migrations/*_character_merge_and_evolution.sql。
const GROWTH_ERROR_MESSAGES: Record<string, string> = {
  PBM01: "育てた仲間を素材にするには、確認が必要です。もう一度選び直してください。",
  PBM02: "これ以上は凸を重ねられません。先に進化させてください。",
  PBM03: "バトル中の仲間は合成できません。バトルを終えてからもう一度試してください。",
  PBM04: "まだ進化できません。4凸まで育ててください。",
  "22023": "同じ種類のうんちくん同士でしか合成できません。",
  "42501": "この仲間は選べません。画面を更新してください。",
  "28000": "セッションが切れました。画面を更新してください。",
};

export function messageForGrowthError(code: string | undefined): string {
  return (code && GROWTH_ERROR_MESSAGES[code])
    ?? "うまく育てられませんでした。時間をおいてもう一度試してください。";
}
