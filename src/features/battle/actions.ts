"use server";

import { createClient } from "@/lib/supabase/server";

import {
  FALLBACK_ATTRIBUTE,
  INITIAL_ENEMY_HP,
  type CharacterAttribute,
} from "./battle.constants";
import { selectCharacterFrom, selectEnemyAttribute } from "./enemy-generator";
import type { BattleEnemy, StartBattleResult } from "./battle.types";

// マスターから読む列。表示に必要なものだけを取る。
const CHARACTER_COLUMNS = "id, name, attribute, rarity, image_key";

type CharacterRow = {
  id: string;
  name: string;
  attribute: CharacterAttribute;
  rarity: string;
  image_key: string | null;
};

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
 * バトルを開始する。敵はサーバーで確定し、クライアントは指定できない（Issue #21）。
 *
 * 引数を取らないのは意図的。敵ID・属性・所有者・乱数シードをクライアントから
 * 受け取らないことで、改ざん不能な開始済みバトルを作る。
 *
 * 既にactiveなバトルがある場合は新規作成せず、それを再開する（MVPの方針）。
 * 戻り値の形は新規・再開で同じにし、クライアントが区別を強いられないようにする。
 */
export async function startBattleAction(): Promise<StartBattleResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      status: "error",
      message: "プレイの準備ができていません。時間をおいて再試行してください。",
    };
  }

  // 1. 既存のactiveバトルがあれば再開する。二重に開始させない。
  const { data: existing, error: existingError } = await supabase
    .from("battle_results")
    .select("id, enemy_character_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    return {
      status: "error",
      message: "バトルを開始できませんでした。時間をおいて再試行してください。",
    };
  }

  if (existing) {
    const { data: character, error: characterError } = await supabase
      .from("characters")
      .select(CHARACTER_COLUMNS)
      .eq("id", existing.enemy_character_id)
      .maybeSingle();

    // 再開対象の敵が引けない場合だけ、この行を諦めて新規作成へ進む。
    if (!characterError && character) {
      return {
        status: "started",
        battleId: existing.id,
        enemy: toEnemy(character as CharacterRow),
        enemyHp: INITIAL_ENEMY_HP,
        resumed: true,
      };
    }
  }

  // 2. 属性をサーバー側乱数で決める。食事ログは読まない。
  const attribute = selectEnemyAttribute();

  const { data: candidates, error: candidatesError } = await supabase
    .from("characters")
    .select(CHARACTER_COLUMNS)
    .eq("attribute", attribute);

  if (candidatesError) {
    return {
      status: "error",
      message: "バトルを開始できませんでした。時間をおいて再試行してください。",
    };
  }

  let character = selectCharacterFrom((candidates ?? []) as CharacterRow[]);

  // 3. 候補が無ければseed済みのフォールバック属性から選ぶ。
  if (!character) {
    const { data: fallbacks } = await supabase
      .from("characters")
      .select(CHARACTER_COLUMNS)
      .eq("attribute", FALLBACK_ATTRIBUTE);

    character = selectCharacterFrom((fallbacks ?? []) as CharacterRow[]);
  }

  if (!character) {
    return {
      status: "error",
      message: "バトルを開始できませんでした。時間をおいて再試行してください。",
    };
  }

  // 4. activeでINSERTする。meal_log_id は null が通常の状態（食事写真は任意）。
  const { data: battle, error: insertError } = await supabase
    .from("battle_results")
    .insert({
      user_id: user.id,
      enemy_character_id: character.id,
      enemy_attribute: character.attribute,
      meal_log_id: null,
      status: "active",
    })
    .select("id")
    .single();

  if (insertError || !battle) {
    return {
      status: "error",
      message: "バトルを開始できませんでした。時間をおいて再試行してください。",
    };
  }

  return {
    status: "started",
    battleId: battle.id,
    enemy: toEnemy(character),
    enemyHp: INITIAL_ENEMY_HP,
    resumed: false,
  };
}
