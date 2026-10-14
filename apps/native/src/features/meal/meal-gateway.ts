import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isMealFoodGroup,
  type MealLogDraft,
  type MealLogSaveResult,
} from "@poopbattler/domain/records/meal.types";

import { isPhotoId } from "@/adapters/photo-store";

// apps/web/src/features/meal/actions.ts と同じ入出力・エラー文言。user_id は RLS 前提で本人の auth.uid() のみ。
export type MealLog = {
  id: string;
  eatenAt: string;
  photoId: string;
  foodGroups: string[];
  note: string | null;
};

const LOGIN_ERROR = "ログイン状態を確認できませんでした。もう一度お試しください。";

function isFoodGroups(value: unknown): value is MealLogDraft["foodGroups"] {
  return Array.isArray(value) && value.length > 0 && value.length <= 24 && value.every(isMealFoodGroup) && new Set(value).size === value.length;
}

export function isMealLogDraft(value: unknown): value is MealLogDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<MealLogDraft>;
  return isPhotoId(draft.photoId)
    && isFoodGroups(draft.foodGroups)
    && typeof draft.eatenAt === "string"
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(draft.eatenAt)
    && !Number.isNaN(Date.parse(draft.eatenAt))
    && (draft.note === undefined || (typeof draft.note === "string" && draft.note.length <= 500));
}

async function getCurrentUser(supabase: SupabaseClient) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error(LOGIN_ERROR);
  return user;
}

export function createMealGateway(supabase: SupabaseClient) {
  return {
    async saveMealLog(draft: MealLogDraft): Promise<MealLogSaveResult> {
      if (!isMealLogDraft(draft)) return { success: false, message: "入力内容を確認してください。" };

      let user;
      try {
        user = await getCurrentUser(supabase);
      } catch {
        return { success: false, message: LOGIN_ERROR };
      }

      const { data, error } = await supabase
        .from("meal_logs")
        .insert({
          user_id: user.id,
          eaten_at: draft.eatenAt,
          image_path: draft.photoId,
          food_groups: draft.foodGroups,
          note: draft.note,
        })
        .select("id")
        .single();
      if (error || typeof data?.id !== "string") {
        return { success: false, message: "食事ログの保存に失敗しました。もう一度お試しください。" };
      }
      return { success: true, mealLogId: data.id };
    },

    async getMealLogs(): Promise<MealLog[]> {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return [];
      const { data, error } = await supabase
        .from("meal_logs")
        .select("id, eaten_at, image_path, food_groups, note")
        .eq("user_id", user.id)
        .order("eaten_at", { ascending: false });
      if (error || !data) throw new Error("食事ログの取得に失敗しました。");

      return data.map((row) => ({
        id: row.id,
        eatenAt: row.eaten_at,
        photoId: row.image_path,
        foodGroups: row.food_groups,
        note: row.note,
      }));
    },

    /** 差し替え前の image_path を返す。呼び出し側で端末内の旧写真を消す。 */
    async replaceMealLogPhoto(mealLogId: unknown, photoId: unknown): Promise<string> {
      if (!isPhotoId(mealLogId) || !isPhotoId(photoId)) throw new Error("入力内容が不正です。");

      const user = await getCurrentUser(supabase);
      const { data: existing, error: existingError } = await supabase
        .from("meal_logs")
        .select("image_path")
        .eq("id", mealLogId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (existingError || !existing) throw new Error("食事写真の差し替えに失敗しました。");

      const { error } = await supabase
        .from("meal_logs")
        .update({ image_path: photoId })
        .eq("id", mealLogId)
        .eq("user_id", user.id);
      if (error) throw new Error("食事写真の差し替えに失敗しました。");
      return existing.image_path;
    },

    async deleteMealLog(mealLogId: unknown): Promise<string> {
      if (!isPhotoId(mealLogId)) throw new Error("入力内容が不正です。");

      const user = await getCurrentUser(supabase);
      const { data, error } = await supabase
        .from("meal_logs")
        .delete()
        .eq("id", mealLogId)
        .eq("user_id", user.id)
        .select("image_path")
        .maybeSingle();
      if (error || !data) throw new Error("食事ログの削除に失敗しました。");
      return data.image_path;
    },
  };
}

export type MealGateway = ReturnType<typeof createMealGateway>;
