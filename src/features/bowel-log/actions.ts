"use server";

import { createClient } from "@/lib/supabase/server";

import type { BowelLog } from "./bowel-log.types";
import type { Database } from "@/types/database.types";

type CharacterRow = Database["public"]["Tables"]["characters"]["Row"];

export type BattleHistoryLog = {
  battleId: string;
  completedAt: string;
  companionshipResult: boolean;
  mealFoodGroups: string[] | null;
  enemy: Pick<CharacterRow, "id" | "name" | "attribute">;
  bowelLog: BowelLog | null;
};

/** 本人が確定したバトルだけを、関連記録と合わせて新しい順に返す。 */
export async function getBattleHistoryAction(): Promise<BattleHistoryLog[]> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return [];

  const { data, error } = await supabase
    .from("battle_results")
    .select(`
      id,
      started_at,
      completed_at,
      companionship_result,
      meal_logs!battle_results_meal_log_id_fkey(food_groups),
      characters!battle_results_enemy_character_id_fkey(id, name, attribute),
      bowel_logs(hardness, amount, color, ease)
    `)
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  if (error) {
    console.error("[getBattleHistoryAction]", {
      code: error.code,
      details: error.details,
      hint: error.hint,
      message: error.message,
    });
    throw new Error("履歴の読み込みに失敗しました。");
  }

  return data.flatMap((battle) => {
    const enemy = battle.characters;
    if (!enemy) return [];

    const bowel = battle.bowel_logs;
    return [{
      battleId: battle.id,
      // completed の行では completed_at が入る。過去の不整合行でも表示を壊さない。
      completedAt: battle.completed_at ?? battle.started_at,
      companionshipResult: battle.companionship_result === true,
      mealFoodGroups: battle.meal_logs?.food_groups ?? null,
      enemy: {
        id: enemy.id,
        name: enemy.name,
        attribute: enemy.attribute,
      },
      bowelLog: bowel && {
        hardness: bowel.hardness as BowelLog["hardness"],
        amount: bowel.amount as BowelLog["amount"],
        color: bowel.color as BowelLog["color"],
        ease: bowel.ease as BowelLog["ease"],
      },
    }];
  });
}
