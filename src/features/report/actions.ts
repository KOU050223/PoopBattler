"use server";

import { createClient } from "@/lib/supabase/server";

import { createWeeklyReport, getWeeklyReportRange, type WeeklyReport } from "./weekly-report";

/** 本人の記録だけを読み、今週のレポートに必要な最小期間を集計する。 */
export async function getWeeklyReportAction(now = new Date().toISOString()): Promise<WeeklyReport | null> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const range = getWeeklyReportRange(now);
  const [bowelResult, mealResult] = await Promise.all([
    supabase
      .from("bowel_logs")
      .select("logged_at, hardness, amount, color, ease")
      .eq("user_id", user.id)
      .gte("logged_at", range.previousStartsAt.toISOString())
      .order("logged_at", { ascending: false }),
    supabase
      .from("meal_logs")
      .select("eaten_at, tag")
      .eq("user_id", user.id)
      .gte("eaten_at", range.relationshipMealStartsAt.toISOString())
      .order("eaten_at", { ascending: false }),
  ]);

  if (bowelResult.error || mealResult.error) {
    throw new Error("レポートの読み込みに失敗しました。");
  }

  return createWeeklyReport({
    now,
    bowelLogs: bowelResult.data.map((log) => ({
      loggedAt: log.logged_at,
      hardness: log.hardness,
      amount: log.amount as "small" | "normal" | "large",
      color: log.color as "brown" | "dark_brown" | "yellow" | "green",
      ease: log.ease as "easy" | "normal" | "hard",
    })),
    mealLogs: mealResult.data.map((log) => ({ eatenAt: log.eaten_at, tag: log.tag })),
  });
}
