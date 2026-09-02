import type { Database } from "@/types/database.types";

export type CharacterAttribute =
  Database["public"]["Enums"]["character_attribute"];

// 敵として出現しうる属性。食事ログは参照せず、ここから一様に抽選する（Issue #21）。
//
// "normal" もプールに含める。マスターには "normal" 属性のキャラクターが
// 複数seedされており、「食事写真ゼロでも遊べる」通常ケースの敵として出す。
// フォールバック専用の予備属性ではない。
export const ENEMY_ATTRIBUTES: readonly CharacterAttribute[] = [
  "curry",
  "vegetable",
  "spicy",
  "meat",
  "sweet",
  "dairy",
  "normal",
] as const;

// 属性に一致するキャラクターがマスターに1件もない場合の最終手段。
// seed.sql が投入する "normal" 属性のキャラクターを指す。
export const FALLBACK_ATTRIBUTE: CharacterAttribute = "normal";

// バトル開始時のHP。確定結果だけを保存する方針のため、進行中のHPはクライアント管理。
export const INITIAL_ENEMY_HP = 100;
