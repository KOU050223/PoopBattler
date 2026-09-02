import type { Database } from "@/types/database.types";

import { FALLBACK_ATTRIBUTE, INITIAL_ENEMY_HP } from "./battle.constants";
import {
  selectCharacterFrom,
  selectEnemyAttribute,
  type RandomSource,
} from "./enemy-generator";
import type { BattleEnemy, StartBattleResult } from "./battle.types";

// 生成された型から必要な列だけを抜き出す。手書きの形にすると、列名や
// 型が変わってもコンパイルが通り、実行時に黙って壊れる（AGENTS.md）。
export type CharacterRow = Pick<
  Database["public"]["Tables"]["characters"]["Row"],
  "id" | "name" | "attribute" | "rarity" | "image_key"
>;

export type ActiveBattleRow = {
  id: string;
  enemy_character_id: string;
};

// Supabaseクライアントそのものではなく、この機能が必要とする操作だけを受け取る。
// lib/supabase/anonymous-session.ts と同じ方針で、Docker無しでも分岐を検証できる。
export type StartBattleGateway = {
  getUserId: () => Promise<{ userId: string | null; failed: boolean }>;
  findActiveBattle: () => Promise<{
    battle: ActiveBattleRow | null;
    failed: boolean;
  }>;
  findCharacterById: (id: string) => Promise<CharacterRow | null>;
  findCharactersByAttribute: (
    attribute: CharacterRow["attribute"],
  ) => Promise<{ characters: CharacterRow[]; failed: boolean }>;
  insertBattle: (input: {
    userId: string;
    character: CharacterRow;
  }) => Promise<{ battleId: string | null }>;
};

const AUTH_ERROR = "プレイの準備ができていません。時間をおいて再試行してください。";
const START_ERROR = "バトルを開始できませんでした。時間をおいて再試行してください。";

function toEnemy(character: CharacterRow): BattleEnemy {
  return {
    characterId: character.id,
    name: character.name,
    attribute: character.attribute,
    rarity: character.rarity,
    imageKey: character.image_key,
  };
}

/**
 * バトル開始の本体。敵はサーバーで確定し、クライアントは指定できない（Issue #21）。
 *
 * 既にactiveなバトルがある場合は新規作成せず再開する（MVPの方針）。
 * 戻り値の形は新規・再開で同じにし、クライアントに区別を強いない。
 */
export async function startBattle(
  gateway: StartBattleGateway,
  random: RandomSource = Math.random,
): Promise<StartBattleResult> {
  const { userId, failed: authFailed } = await gateway.getUserId();

  if (authFailed || !userId) {
    return { status: "error", message: AUTH_ERROR };
  }

  // 1. 既存のactiveバトルがあれば再開する。二重に開始させない。
  const { battle: existing, failed: existingFailed } =
    await gateway.findActiveBattle();

  if (existingFailed) {
    return { status: "error", message: START_ERROR };
  }

  if (existing) {
    const character = await gateway.findCharacterById(
      existing.enemy_character_id,
    );

    // 再開対象の敵が引けない場合だけ、この行を諦めて新規作成へ進む。
    if (character) {
      return {
        status: "started",
        battleId: existing.id,
        enemy: toEnemy(character),
        enemyHp: INITIAL_ENEMY_HP,
        resumed: true,
      };
    }
  }

  // 2. 属性をサーバー側乱数で決める。食事ログは読まない。
  const attribute = selectEnemyAttribute(random);
  const { characters, failed: candidatesFailed } =
    await gateway.findCharactersByAttribute(attribute);

  if (candidatesFailed) {
    return { status: "error", message: START_ERROR };
  }

  let character = selectCharacterFrom(characters, random);

  // 3. 候補が無ければseed済みのフォールバック属性から選ぶ。
  if (!character) {
    const fallback = await gateway.findCharactersByAttribute(FALLBACK_ATTRIBUTE);
    character = selectCharacterFrom(fallback.characters, random);
  }

  if (!character) {
    return { status: "error", message: START_ERROR };
  }

  // 4. activeでINSERTする。meal_log_id は null が通常の状態（食事写真は任意）。
  const { battleId } = await gateway.insertBattle({ userId, character });

  if (!battleId) {
    return { status: "error", message: START_ERROR };
  }

  return {
    status: "started",
    battleId,
    enemy: toEnemy(character),
    enemyHp: INITIAL_ENEMY_HP,
    resumed: false,
  };
}
