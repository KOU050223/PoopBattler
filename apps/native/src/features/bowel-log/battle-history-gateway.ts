import type { SupabaseClient } from "@supabase/supabase-js";
import type { BowelLog } from "@poopbattler/domain/records/bowel-log.types";
import type { Database } from "@poopbattler/domain/types/database.types";

type CharacterRow = Database["public"]["Tables"]["characters"]["Row"];

export type BattleHistoryLog = {
  battleId: string;
  completedAt: string;
  companionshipResult: boolean;
  mealFoodGroups: string[] | null;
  enemy: Pick<CharacterRow, "id" | "name" | "attribute">;
  bowelLog: BowelLog | null;
};

type BattleRow = {
  id: string;
  started_at: string;
  completed_at: string | null;
  companionship_result: boolean | null;
  meal_logs: { food_groups: string[] } | null;
  characters: Pick<CharacterRow, "id" | "name" | "attribute"> | null;
  bowel_logs: { hardness: number; amount: string; color: string; ease: string; symptoms: string[] | null } | null;
};

/** apps/web/src/features/bowel-log/actions.ts と同じ。本人が確定したバトルを関連記録つきで新しい順に返す。 */
export function createBattleHistoryGateway(supabase: SupabaseClient) {
  return {
    async getBattleHistory(): Promise<BattleHistoryLog[]> {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
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
          bowel_logs(hardness, amount, color, ease, symptoms)
        `)
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false });

      if (error || !data) throw new Error("履歴の読み込みに失敗しました。");

      return (data as unknown as BattleRow[]).flatMap((battle) => {
        const enemy = battle.characters;
        if (!enemy) return [];

        const bowel = battle.bowel_logs;
        return [{
          battleId: battle.id,
          completedAt: battle.completed_at ?? battle.started_at,
          companionshipResult: battle.companionship_result === true,
          mealFoodGroups: battle.meal_logs?.food_groups ?? null,
          enemy: { id: enemy.id, name: enemy.name, attribute: enemy.attribute },
          bowelLog: bowel && {
            hardness: bowel.hardness as BowelLog["hardness"],
            amount: bowel.amount as BowelLog["amount"],
            color: bowel.color as BowelLog["color"],
            ease: bowel.ease as BowelLog["ease"],
            symptoms: (bowel.symptoms ?? []) as NonNullable<BowelLog["symptoms"]>,
          },
        }];
      });
    },
  };
}
