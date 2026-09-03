import { createClient } from "@/lib/supabase/server";

import { hasActiveEntitlement } from "./report-access";
import { createWeeklyReport, getWeeklyReportRange, type WeeklyReport } from "./weekly-report";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 非課金ユーザーへ渡してよい範囲。分析値はここに一切含めない。 */
export type ReportTeaser = {
  bowelCount: number;
  recordedDays: number;
};

/**
 * レポート画面の取得結果。
 *
 * 権利の有無を判別可能なユニオンで表し、非課金ブランチには分析値の場所を
 * 用意しない。プロパティを undefined にする形だと、後から誤って詰めても
 * 型では気づけず、RSCペイロードに実値が載る。
 */
export type ReportResult =
  | { entitled: true; report: WeeklyReport }
  | { entitled: false; teaser: ReportTeaser };

/**
 * 本人の記録だけを読み、権利があれば今週のレポートを、無ければ件数だけを返す。
 *
 * 権利判定はSupabaseから記録を読む前に行う。判定を呼び出し側（page.tsx）に
 * 置くと、非課金ユーザーでも4週分の分析が計算され、描画しないだけで
 * RSCペイロードに載ってしまう。
 */
export async function getWeeklyReportAction(now = new Date().toISOString()): Promise<ReportResult | null> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  // 権利の読取失敗を「権利なし」に丸めない。課金済みの利用者へ
  // 黙ってペイウォールを出すより、エラーとして見えた方がよい。
  if (subscriptionError) {
    throw new Error("レポートの読み込みに失敗しました。");
  }

  const range = getWeeklyReportRange(now);
  if (!hasActiveEntitlement(subscription, new Date(now))) {
    return { entitled: false, teaser: await fetchTeaser(supabase, user.id, range) };
  }

  const fourWeekStartsAt = new Date(range.previousStartsAt.getTime() - 2 * 7 * 24 * 60 * 60 * 1000);
  const [bowelResult, mealResult] = await Promise.all([
    supabase
      .from("bowel_logs")
      .select("id, logged_at, hardness, amount, color, ease")
      .eq("user_id", user.id)
      .gte("logged_at", fourWeekStartsAt.toISOString())
      .order("logged_at", { ascending: false }),
    supabase
      .from("meal_logs")
      .select("eaten_at, tag")
      .eq("user_id", user.id)
      .gte("eaten_at", fourWeekStartsAt.toISOString())
      .order("eaten_at", { ascending: false }),
  ]);

  if (bowelResult.error || mealResult.error) {
    throw new Error("レポートの読み込みに失敗しました。");
  }

  return {
    entitled: true,
    report: createWeeklyReport({
      now,
      bowelLogs: bowelResult.data.map((log) => ({
        id: log.id,
        loggedAt: log.logged_at,
        hardness: log.hardness,
        amount: log.amount as "small" | "normal" | "large",
        color: log.color as "brown" | "dark_brown" | "yellow" | "green",
        ease: log.ease as "easy" | "normal" | "hard",
      })),
      mealLogs: mealResult.data.map((log) => ({ eatenAt: log.eaten_at, tag: log.tag })),
    }),
  };
}

/**
 * 非課金ユーザー向けに、今週の記録件数と記録日数だけを数える。
 *
 * 硬さや量など分析に使う列は選ばない。SELECT する列を絞ることが、
 * 「うっかり渡す」経路そのものを無くす一番確実な方法になる。
 */
async function fetchTeaser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  range: ReturnType<typeof getWeeklyReportRange>,
): Promise<ReportTeaser> {
  const { data, error } = await supabase
    .from("bowel_logs")
    .select("logged_at")
    .eq("user_id", userId)
    .gte("logged_at", range.startsAt.toISOString())
    .lte("logged_at", range.endsAt.toISOString());

  if (error) {
    throw new Error("レポートの読み込みに失敗しました。");
  }

  const days = new Set(
    data.map((log) => new Date(new Date(log.logged_at).getTime() + JST_OFFSET_MS).toISOString().slice(0, 10)),
  );

  return { bowelCount: data.length, recordedDays: days.size };
}
