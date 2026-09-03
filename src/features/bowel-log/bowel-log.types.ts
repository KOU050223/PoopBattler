export const BOWEL_HARDNESS_OPTIONS = [
  { value: 1, label: "1（硬い）" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4（普通）" },
  { value: 5, label: "5" },
  { value: 6, label: "6" },
  { value: 7, label: "7（ゆるい）" },
] as const;

export const BOWEL_AMOUNT_OPTIONS = [
  { value: "small", label: "少ない" },
  { value: "normal", label: "普通" },
  { value: "large", label: "多い" },
] as const;

export const BOWEL_COLOR_OPTIONS = [
  { value: "brown", label: "茶色" },
  { value: "dark_brown", label: "濃い茶色" },
  { value: "yellow", label: "黄色" },
  { value: "green", label: "緑色" },
] as const;

export const BOWEL_EASE_OPTIONS = [
  { value: "easy", label: "すっきり" },
  { value: "normal", label: "普通" },
  { value: "hard", label: "出にくい" },
] as const;

export type BowelHardness = (typeof BOWEL_HARDNESS_OPTIONS)[number]["value"];
export type BowelAmount = (typeof BOWEL_AMOUNT_OPTIONS)[number]["value"];
export type BowelColor = (typeof BOWEL_COLOR_OPTIONS)[number]["value"];
export type BowelEase = (typeof BOWEL_EASE_OPTIONS)[number]["value"];

/** 未送信の選択途中入力。バトル復元に含める。 */
export type BowelLogDraft = Partial<BowelLog>;

/** 完了/02へ渡せる、4項目が揃った排便記録。 */
export type BowelLog = {
  hardness: BowelHardness;
  amount: BowelAmount;
  color: BowelColor;
  ease: BowelEase;
};

function includes<T>(options: readonly { value: T }[], value: unknown): value is T {
  return options.some((option) => option.value === value);
}

export function isBowelLog(value: unknown): value is BowelLog {
  if (!value || typeof value !== "object") return false;

  const draft = value as Partial<BowelLog>;
  return includes(BOWEL_HARDNESS_OPTIONS, draft.hardness)
    && includes(BOWEL_AMOUNT_OPTIONS, draft.amount)
    && includes(BOWEL_COLOR_OPTIONS, draft.color)
    && includes(BOWEL_EASE_OPTIONS, draft.ease);
}
