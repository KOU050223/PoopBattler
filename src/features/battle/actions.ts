"use server";

import { createClient } from "@/lib/supabase/server";
import { isBowelLog, type BowelLog } from "@/features/bowel-log/bowel-log.types";
import { revalidatePath } from "next/cache";

import type { StartBattleResult } from "./battle.types";
import {
  startBattle,
  type CharacterRow,
  type StartBattleGateway,
} from "./start-battle";

// マスターから読む列。表示に必要なものだけを取る。
const CHARACTER_COLUMNS = "id, name, attribute, rarity, image_key";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// Supabaseの呼び出しをここに閉じ込める。分岐の検証は start-battle.ts 側で行う。
function createGateway(supabase: SupabaseClient): StartBattleGateway {
  return {
    async getUserId() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      return { userId: user?.id ?? null, failed: Boolean(error) };
    },

    async findActiveBattle() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // RLSでも本人に絞られるが、条件をクエリにも書く。RLSの変更が
      // 静かに他人の行を拾う経路にならないようにする。
      const { data, error } = await supabase
        .from("battle_results")
        .select("id, enemy_character_id")
        .eq("user_id", user?.id ?? "")
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return { battle: data ?? null, failed: Boolean(error) };
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

    async insertBattle({ userId, character }: {
      userId: string;
      character: CharacterRow;
    }) {
      const { data } = await supabase
        .from("battle_results")
        .insert({
          user_id: userId,
          enemy_character_id: character.id,
          enemy_attribute: character.attribute,
          meal_log_id: null,
          status: "active",
        })
        .select("id")
        .single();

      return { battleId: data?.id ?? null };
    },
  };
}

/**
 * バトルを開始する。敵はサーバーで確定し、クライアントは指定できない（Issue #21）。
 *
 * 引数を取らないのは意図的。敵ID・属性・所有者・乱数シードをクライアントから
 * 受け取らないことで、改ざん不能な開始済みバトルを作る。
 */
export async function startBattleAction(): Promise<StartBattleResult> {
  const supabase = await createClient();

  return startBattle(createGateway(supabase));
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
      acquiredCharacterId: string | null;
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

/** 排便ログ・バトル結果・仲間化を RPC で一度だけ確定する。 */
export async function completeBattleAction(input: unknown): Promise<CompleteBattleResult> {
  if (!isCompleteBattleInput(input)) {
    return { success: false, message: "入力内容を確認してください。" };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, message: "ログイン状態を確認できませんでした。もう一度お試しください。" };
  }

  const rpcInput = {
    p_battle_id: input.battleId,
    p_hardness: input.bowelLog.hardness,
    p_amount: input.bowelLog.amount,
    p_color: input.bowelLog.color,
    p_ease: input.bowelLog.ease,
    ...(input.mealLogId ? { p_meal_log_id: input.mealLogId } : {}),
  };
  const { data, error } = await supabase.rpc("complete_battle", rpcInput);
  const result = data?.[0];

  if (
    error
    || !result
    || result.battle_id !== input.battleId
    || result.status !== "completed"
    || typeof result.companionship_result !== "boolean"
    || (result.character_id !== null && typeof result.character_id !== "string")
  ) {
    return { success: false, message: "バトルの完了に失敗しました。もう一度お試しください。" };
  }

  revalidatePath("/battle");
  revalidatePath("/logs");
  revalidatePath("/collection");

  return {
    success: true,
    battleId: result.battle_id,
    companionshipResult: result.companionship_result,
    acquiredCharacterId: result.character_id,
  };
}
