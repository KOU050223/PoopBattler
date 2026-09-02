"use server";

import { MEAL_TAGS, type MealLogDraft, type MealLogSaveResult } from "./meal.types";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type MealLog = {
  id: string;
  eatenAt: string;
  photoId: string;
  tag: string;
  note: string | null;
};

function isMealTag(value: unknown): value is MealLogDraft["tag"] {
  return MEAL_TAGS.some((tag) => tag.value === value);
}

function isPhotoId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isMealLogId(value: unknown): value is string {
  return isPhotoId(value);
}

async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("ログイン状態を確認できませんでした。もう一度お試しください。");
  return { supabase, user };
}

function isMealLogDraft(value: unknown): value is MealLogDraft {
  if (!value || typeof value !== "object") return false;

  const draft = value as Partial<MealLogDraft>;
  return isPhotoId(draft.photoId)
    && isMealTag(draft.tag)
    && typeof draft.eatenAt === "string"
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(draft.eatenAt)
    && !Number.isNaN(Date.parse(draft.eatenAt))
    && (draft.note === undefined || (typeof draft.note === "string" && draft.note.length <= 500));
}

/**
 * 画像本体はクライアントのIndexedDBへ保存済みである前提で、画像IDだけを食事ログへ保存する。
 */
export async function saveMealLogAction(draft: MealLogDraft): Promise<MealLogSaveResult> {
  if (!isMealLogDraft(draft)) {
    return { success: false, message: "入力内容を確認してください。" };
  }

  let currentUser: Awaited<ReturnType<typeof getCurrentUser>>;
  try {
    currentUser = await getCurrentUser();
  } catch {
    return { success: false, message: "ログイン状態を確認できませんでした。もう一度お試しください。" };
  }
  const { supabase, user } = currentUser;

  const { error } = await supabase.from("meal_logs").insert({
    user_id: user.id,
    eaten_at: draft.eatenAt,
    image_path: draft.photoId,
    tag: draft.tag,
    note: draft.note,
  });
  if (error) return { success: false, message: "食事ログの保存に失敗しました。もう一度お試しください。" };
  revalidatePath("/meals");
  return { success: true };
}

/** 本人の食事ログだけを新しい順に返す。画像本体はIndexedDBからクライアントで取得する。 */
export async function getMealLogsAction(): Promise<MealLog[]> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return [];
  const { data, error } = await supabase
    .from("meal_logs")
    .select("id, eaten_at, image_path, tag, note")
    .order("eaten_at", { ascending: false });
  if (error) throw new Error("食事ログの取得に失敗しました。");

  return data.map((mealLog) => ({
    id: mealLog.id,
    eatenAt: mealLog.eaten_at,
    photoId: mealLog.image_path,
    tag: mealLog.tag,
    note: mealLog.note,
  }));
}

export async function replaceMealLogPhotoAction(mealLogId: unknown, photoId: unknown) {
  if (!isMealLogId(mealLogId) || !isPhotoId(photoId)) throw new Error("入力内容が不正です。");

  const { supabase, user } = await getCurrentUser();
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
  revalidatePath("/meals");
  return existing.image_path;
}

export async function deleteMealLogAction(mealLogId: unknown) {
  if (!isMealLogId(mealLogId)) throw new Error("入力内容が不正です。");

  const { supabase, user } = await getCurrentUser();
  const { data, error } = await supabase
    .from("meal_logs")
    .delete()
    .eq("id", mealLogId)
    .eq("user_id", user.id)
    .select("image_path")
    .maybeSingle();
  if (error || !data) throw new Error("食事ログの削除に失敗しました。");
  revalidatePath("/meals");
  return data.image_path;
}
