"use server";

import { createClient } from "@/lib/supabase/server";

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
      const { data } = await supabase
        .from("characters")
        .select(CHARACTER_COLUMNS)
        .eq("id", id)
        .maybeSingle();

      return data ?? null;
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
