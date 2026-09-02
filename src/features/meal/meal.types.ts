/**
 * 食事ログで選べるMVPタグ。自由入力の文言はバトル属性に使わない。
 * `attribute` はバトル中に食事を「あげる」ときの敵属性決定に渡す値。
 */
export const MEAL_TAGS = [
  { value: "curry", label: "カレー", attribute: "curry" },
  { value: "vegetable", label: "野菜", attribute: "vegetable" },
  { value: "banana", label: "バナナ", attribute: "sweet" },
  { value: "dairy", label: "乳製品", attribute: "dairy" },
  { value: "spicy", label: "激辛", attribute: "spicy" },
  { value: "other", label: "その他", attribute: "normal" },
] as const;

export type MealTag = (typeof MEAL_TAGS)[number]["value"];
export type MealAttribute = (typeof MEAL_TAGS)[number]["attribute"];

export type MealLogDraft = {
  /** IndexedDBに保存した画像のID。画像本体はSupabaseへ送信しない。 */
  photoId: string;
  eatenAt: string;
  tag: MealTag;
  note?: string;
};

export function getMealAttribute(tag: MealTag): MealAttribute {
  return MEAL_TAGS.find((mealTag) => mealTag.value === tag)!.attribute;
}
