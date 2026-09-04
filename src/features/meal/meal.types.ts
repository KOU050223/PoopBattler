/** 食事バランスガイドと日本食品標準成分表を参考に、入力負荷を抑えた食品群・栄養観点。ゲーム属性とは独立している。 */
export const MEAL_FOOD_GROUPS = [
  { category: "主食", items: [{ value: "rice", label: "ごはん" }, { value: "bread", label: "パン" }, { value: "noodles", label: "麺" }, { value: "potatoes", label: "いも類" }] },
  { category: "主菜・たんぱく源", items: [{ value: "meat", label: "肉" }, { value: "fish", label: "魚" }, { value: "eggs", label: "卵" }, { value: "soy_products", label: "大豆製品" }] },
  { category: "野菜・きのこ・海藻", items: [{ value: "green_yellow_vegetables", label: "緑黄色野菜" }, { value: "light_colored_vegetables", label: "淡色野菜" }, { value: "mushrooms", label: "きのこ" }, { value: "seaweed", label: "海藻" }] },
  { category: "乳・発酵食品", items: [{ value: "milk", label: "牛乳" }, { value: "yogurt", label: "ヨーグルト" }, { value: "cheese", label: "チーズ" }, { value: "fermented_foods", label: "発酵食品" }] },
  { category: "果物・甘味", items: [{ value: "fruit", label: "果物" }, { value: "sweets", label: "菓子" }, { value: "sugary_drinks", label: "甘い飲み物" }] },
  { category: "脂質・刺激物", items: [{ value: "fried_food", label: "揚げ物" }, { value: "fatty_food", label: "脂っこいもの" }, { value: "spicy_food", label: "辛いもの" }, { value: "alcohol", label: "アルコール" }] },
  { category: "その他", items: [{ value: "other", label: "その他" }] },
] as const;

export const MEAL_FOOD_GROUP_OPTIONS = [
  ...MEAL_FOOD_GROUPS[0].items,
  ...MEAL_FOOD_GROUPS[1].items,
  ...MEAL_FOOD_GROUPS[2].items,
  ...MEAL_FOOD_GROUPS[3].items,
  ...MEAL_FOOD_GROUPS[4].items,
  ...MEAL_FOOD_GROUPS[5].items,
  ...MEAL_FOOD_GROUPS[6].items,
] as const;
export type MealFoodGroup = (typeof MEAL_FOOD_GROUP_OPTIONS)[number]["value"];

export type MealLogDraft = {
  /** IndexedDBに保存した画像のID。画像本体はSupabaseへ送信しない。 */
  photoId: string;
  eatenAt: string;
  foodGroups: MealFoodGroup[];
  note?: string;
};

export type MealLogSaveResult =
  | { success: true; mealLogId: string }
  | { success: false; message: string };

export function isMealFoodGroup(value: unknown): value is MealFoodGroup {
  return MEAL_FOOD_GROUP_OPTIONS.some((foodGroup) => foodGroup.value === value);
}

export function getMealFoodGroupLabel(value: string) {
  return MEAL_FOOD_GROUP_OPTIONS.find((foodGroup) => foodGroup.value === value)?.label ?? value;
}
