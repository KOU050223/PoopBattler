"use server";

import { MEAL_TAGS, type MealLogDraft } from "./meal.types";
import { createClient } from "@/lib/supabase/server";

function isMealTag(value: unknown): value is MealLogDraft["tag"] {
  return MEAL_TAGS.some((tag) => tag.value === value);
}

function isPhotoId(value: unknown) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isMealLogDraft(value: unknown): value is MealLogDraft {
  if (!value || typeof value !== "object") return false;

  const draft = value as Partial<MealLogDraft>;
  return isPhotoId(draft.photoId)
    && isMealTag(draft.tag)
    && typeof draft.eatenAt === "string"
    && !Number.isNaN(new Date(draft.eatenAt).getTime())
    && (draft.note === undefined || (typeof draft.note === "string" && draft.note.length <= 500));
}

/**
 * 画像本体はクライアントのIndexedDBへ保存済みである前提で、画像IDだけを食事ログへ保存する。
 */
export async function saveMealLogAction(draft: MealLogDraft) {
  if (!isMealLogDraft(draft)) {
    throw new Error("入力内容が不正です。");
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("ログイン状態を確認できませんでした。もう一度お試しください。");

  const { error } = await supabase.from("meal_logs").insert({
    user_id: user.id,
    eaten_at: draft.eatenAt,
    image_path: draft.photoId,
    tag: draft.tag,
    note: draft.note,
  });
  if (error) throw new Error("食事ログの保存に失敗しました。");
}
