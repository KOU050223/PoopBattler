import type { SupabaseClient } from "@supabase/supabase-js";

import { PARTY_SIZE } from "@poopbattler/domain/battle/battle.constants";
import type { StartBattleResult } from "@poopbattler/domain/battle/battle.types";
import { messageForCompleteBattleError } from "@poopbattler/domain/battle/complete-battle-error";
import { isFirstCompletedBattle } from "@poopbattler/domain/battle/install-promotion-eligibility";
import {
  readStartBattleUserCharacterIds,
  startBattle,
  type PartySnapshotMember,
  type StartBattleGateway,
} from "@poopbattler/domain/battle/start-battle";
import { isBowelLog, type BowelLog } from "@poopbattler/domain/records/bowel-log.types";
import type { Database } from "@poopbattler/domain/types/database.types";

// マスターから読む列。表示に必要なものだけを取る。
const CHARACTER_COLUMNS = "id, name, attribute, rarity, image_key";

type Client = SupabaseClient<Database>;

// party_snapshot は jsonb で、生成される型は Json。開始のたびに形を確かめる。
function isPartySnapshot(value: unknown): value is PartySnapshotMember[] {
  return (
    Array.isArray(value)
    && value.every((member) => {
      if (!member || typeof member !== "object") return false;
      const row = member as Record<string, unknown>;
      return (
        (row.user_character_id === null || typeof row.user_character_id === "string")
        && typeof row.character_id === "string"
        && typeof row.attribute === "string"
        && typeof row.hp === "number"
        && typeof row.power === "number"
        && typeof row.speed === "number"
      );
    })
  );
}

/** web の createGateway と同じ順序・同じ失敗の写像。 */
export function createStartBattleGateway(supabase: Client): StartBattleGateway {
  return {
    async getUserId() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      return { userId: user?.id ?? null, failed: Boolean(error) };
    },

    async findOwnedCharacters() {
      const { data, error } = await supabase
        .from("user_characters")
        .select("id")
        .order("acquired_at", { ascending: false })
        .limit(PARTY_SIZE);
      return { owned: data ?? [], failed: Boolean(error) };
    },

    async startBattle(userCharacterIds) {
      const { data, error } = await supabase.rpc("start_battle", {
        p_user_character_ids: userCharacterIds,
      });
      const battle = data?.[0];
      if (
        !battle
        || typeof battle.battle_id !== "string"
        || typeof battle.enemy_character_id !== "string"
        || typeof battle.enemy_hp !== "number"
        || typeof battle.enemy_power !== "number"
        || typeof battle.enemy_speed !== "number"
        || typeof battle.resumed !== "boolean"
        || !isPartySnapshot(battle.party_snapshot)
      ) {
        console.error("[start_battle rpc]", error?.message ?? error, {
          rowCount: Array.isArray(data) ? data.length : data == null ? 0 : "non-array",
        });
        return { battle: null, failed: true };
      }

      return {
        battle: {
          id: battle.battle_id,
          enemy_character_id: battle.enemy_character_id,
          enemy_hp: battle.enemy_hp,
          enemy_power: battle.enemy_power,
          enemy_speed: battle.enemy_speed,
          party_snapshot: battle.party_snapshot,
          resumed: battle.resumed,
        },
        failed: Boolean(error),
      };
    },

    async findCharacterById(id) {
      const { data, error } = await supabase
        .from("characters")
        .select(CHARACTER_COLUMNS)
        .eq("id", id)
        .maybeSingle();
      return { character: data ?? null, failed: Boolean(error) };
    },

    async findCharactersByAttribute(attribute) {
      const { data, error } = await supabase
        .from("characters")
        .select(CHARACTER_COLUMNS)
        .eq("attribute", attribute);
      return { characters: data ?? [], failed: Boolean(error) };
    },
  };
}

/** 敵はサーバーで確定する。受け取るのは本人の user_characters.id だけ（Issue #21 / #73 / #108）。 */
export function startBattleAction(supabase: Client, input?: unknown): Promise<StartBattleResult> {
  return startBattle(createStartBattleGateway(supabase), readStartBattleUserCharacterIds(input));
}

export type CompleteBattleInput = {
  battleId: string;
  bowelLog: BowelLog;
  mealLogId?: string | null;
};

export type CompleteBattleResult =
  | {
      success: true;
      battleId: string;
      companionshipResult: boolean;
      acquiredCharacter: Pick<
        Database["public"]["Tables"]["characters"]["Row"],
        "id" | "name" | "attribute" | "rarity"
      > | null;
      completedAt: string;
      usedMealLog: boolean;
      isFirstCompletedBattle: boolean;
    }
  | { success: false; message: string };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isCompleteBattleInput(value: unknown): value is CompleteBattleInput {
  if (!value || typeof value !== "object") return false;
  const input = value as Partial<CompleteBattleInput>;
  return isUuid(input.battleId)
    && isBowelLog(input.bowelLog)
    && (input.mealLogId === undefined || input.mealLogId === null || isUuid(input.mealLogId));
}

/** 排便ログ・バトル結果・仲間化を RPC で一度だけ確定する。web の completeBattleAction と同じ順序。 */
export async function completeBattleAction(
  supabase: Client,
  input: unknown,
): Promise<CompleteBattleResult> {
  if (!isCompleteBattleInput(input)) {
    return { success: false, message: "入力内容を確認してください。" };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { success: false, message: "ログイン状態を確認できませんでした。もう一度お試しください。" };
  }

  const { data, error } = await supabase.rpc("complete_battle_with_symptoms", {
    p_battle_id: input.battleId,
    p_hardness: input.bowelLog.hardness,
    p_amount: input.bowelLog.amount,
    p_color: input.bowelLog.color,
    p_ease: input.bowelLog.ease,
    ...(input.mealLogId ? { p_meal_log_id: input.mealLogId } : {}),
    p_symptoms: input.bowelLog.symptoms ?? [],
  });
  const result = data?.[0];

  if (
    error
    || !result
    || result.battle_id !== input.battleId
    || result.status !== "completed"
    || typeof result.companionship_result !== "boolean"
    || (result.character_id !== null && typeof result.character_id !== "string")
    || result.companionship_result !== Boolean(result.character_id)
  ) {
    console.error("[complete_battle rpc]", error?.message ?? error, {
      battleId: input.battleId,
      code: error?.code,
      rowCount: Array.isArray(data) ? data.length : data == null ? 0 : "non-array",
    });
    return { success: false, message: messageForCompleteBattleError(error) };
  }

  const { data: battle, error: battleError } = await supabase
    .from("battle_results")
    .select("completed_at, meal_log_id")
    .eq("id", input.battleId)
    .eq("user_id", user.id)
    .eq("status", "completed")
    .maybeSingle();
  if (battleError || !battle?.completed_at) {
    return { success: false, message: "バトル結果の取得に失敗しました。もう一度お試しください。" };
  }

  const { count: completedBattleCount, error: completedBattleCountError } = await supabase
    .from("battle_results")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "completed");
  if (completedBattleCountError || completedBattleCount == null) {
    return { success: false, message: "バトル結果の確認に失敗しました。もう一度お試しください。" };
  }

  const { count: mealLogCount } = await supabase
    .from("meal_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  let acquiredCharacter: Extract<CompleteBattleResult, { success: true }>["acquiredCharacter"] = null;
  if (result.character_id) {
    const { data: character, error: characterError } = await supabase
      .from("characters")
      .select("id, name, attribute, rarity")
      .eq("id", result.character_id)
      .maybeSingle();
    if (characterError || !character) {
      return { success: false, message: "取得キャラクターの確認に失敗しました。もう一度お試しください。" };
    }
    acquiredCharacter = character;
  }

  return {
    success: true,
    battleId: result.battle_id,
    companionshipResult: result.companionship_result,
    acquiredCharacter,
    completedAt: battle.completed_at,
    usedMealLog: (mealLogCount ?? 0) > 0,
    isFirstCompletedBattle: isFirstCompletedBattle(completedBattleCount),
  };
}

export type PartyPreviewMember = {
  id: string;
  name: string;
  attribute: Database["public"]["Enums"]["character_attribute"];
  hp: number;
};

/** 開始前のパーティ表示用。選出と同じ「新しい順に最大3体」。失敗・0体は空配列（レンタル出撃扱い）。 */
export async function loadPartyPreview(supabase: Client): Promise<PartyPreviewMember[]> {
  const { data, error } = await supabase
    .from("user_characters")
    .select("id, hp, characters(name, attribute)")
    .order("acquired_at", { ascending: false })
    .limit(PARTY_SIZE);
  if (error || !data) return [];

  return data.flatMap((row) => {
    const character = Array.isArray(row.characters) ? row.characters[0] : row.characters;
    return character
      ? [{ id: row.id, name: character.name, attribute: character.attribute, hp: row.hp }]
      : [];
  });
}
