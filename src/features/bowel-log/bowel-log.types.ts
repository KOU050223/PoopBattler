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
  { value: "red", label: "赤" },
  { value: "black", label: "黒" },
  { value: "white_gray", label: "白・灰" },
  { value: "other", label: "その他" },
] as const;

export const BOWEL_EASE_OPTIONS = [
  { value: "easy", label: "すっきり" },
  { value: "normal", label: "普通" },
  { value: "hard", label: "出にくい" },
] as const;

/** 排便時の追加情報。未選択でも記録を完了でき、保存時は空配列で表す。 */
export const BOWEL_SYMPTOM_OPTIONS = [
  { value: "strained", label: "強くいきんだ" },
  { value: "incomplete_evacuation", label: "残便感があった" },
  { value: "abdominal_pain", label: "腹痛があった" },
  { value: "urgent_urge", label: "急な便意があった" },
] as const;

export type BowelHardness = (typeof BOWEL_HARDNESS_OPTIONS)[number]["value"];
export type BowelAmount = (typeof BOWEL_AMOUNT_OPTIONS)[number]["value"];
export type BowelColor = (typeof BOWEL_COLOR_OPTIONS)[number]["value"];
export type BowelEase = (typeof BOWEL_EASE_OPTIONS)[number]["value"];
export type BowelSymptom = (typeof BOWEL_SYMPTOM_OPTIONS)[number]["value"];

/** レポートで共有する便形状の集計区分。 */
export const BOWEL_HARDNESS_GROUPS = [
  { value: "hard", label: "硬め", min: 1, max: 2 },
  { value: "well_formed", label: "整っている", min: 3, max: 4 },
  { value: "soft", label: "柔らかめ", min: 5, max: 7 },
] as const;
export type BowelHardnessGroup = (typeof BOWEL_HARDNESS_GROUPS)[number]["value"];

export function getBowelHardnessGroup(hardness: number): BowelHardnessGroup {
  if (hardness <= 2) return "hard";
  if (hardness <= 4) return "well_formed";
  return "soft";
}

/** 未送信の選択途中入力。バトル復元に含める。 */
export type BowelLogDraft = Partial<BowelLog>;

/** 完了/02へ渡せる、4項目が揃った排便記録。 */
export type BowelLog = {
  hardness: BowelHardness;
  amount: BowelAmount;
  color: BowelColor;
  ease: BowelEase;
  /** 旧バトルの復元データには無いため、省略時はサーバーで空配列として保存する。 */
  symptoms?: BowelSymptom[];
};

function includes<T>(options: readonly { value: T }[], value: unknown): value is T {
  return options.some((option) => option.value === value);
}

export function isBowelLog(value: unknown): value is BowelLog {
  if (!value || typeof value !== "object") return false;

  const draft = value as Partial<BowelLog>;
  const symptomsAreValid = draft.symptoms === undefined
    || (Array.isArray(draft.symptoms)
      && draft.symptoms.every((symptom) => includes(BOWEL_SYMPTOM_OPTIONS, symptom))
      && new Set(draft.symptoms).size === draft.symptoms.length);

  return includes(BOWEL_HARDNESS_OPTIONS, draft.hardness)
    && includes(BOWEL_AMOUNT_OPTIONS, draft.amount)
    && includes(BOWEL_COLOR_OPTIONS, draft.color)
    && includes(BOWEL_EASE_OPTIONS, draft.ease)
    && symptomsAreValid;
}
