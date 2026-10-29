import type { MealFoodGroup } from "@poopbattler/domain/records/meal.types";

import type Ionicons from "@expo/vector-icons/Ionicons";

export type MealFoodTile = {
  value: MealFoodGroup;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
};

// 子どもの画面にはアルコールとカフェインを出さない。保存値の MealFoodGroup 自体は変えない。
export const MEAL_FOOD_TILES: readonly MealFoodTile[] = [
  { value: "rice", labelKey: "Gohan.food.rice", icon: "restaurant" },
  { value: "bread", labelKey: "Gohan.food.bread", icon: "fast-food" },
  { value: "noodles", labelKey: "Gohan.food.noodles", icon: "cafe" },
  { value: "meat", labelKey: "Gohan.food.meat", icon: "flame" },
  { value: "fish", labelKey: "Gohan.food.fish", icon: "fish" },
  { value: "eggs", labelKey: "Gohan.food.eggs", icon: "egg" },
  { value: "green_yellow_vegetables", labelKey: "Gohan.food.coloredVegetables", icon: "leaf" },
  { value: "light_colored_vegetables", labelKey: "Gohan.food.whiteVegetables", icon: "flower" },
  { value: "fruit", labelKey: "Gohan.food.fruit", icon: "nutrition" },
  { value: "milk", labelKey: "Gohan.food.milk", icon: "water" },
  { value: "sweets", labelKey: "Gohan.food.sweets", icon: "ice-cream" },
  { value: "other", labelKey: "Gohan.food.other", icon: "ellipsis-horizontal" },
];

/** 保存値の食品名を、一覧カードの短い表示名にする。タイルにない値（過去データ）は出さない。 */
export function foodLabelKeys(foodGroups: readonly string[]): string[] {
  return foodGroups.flatMap((value) => MEAL_FOOD_TILES.find((tile) => tile.value === value)?.labelKey ?? []);
}
