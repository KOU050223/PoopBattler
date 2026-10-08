import { describe, expect, it } from "vitest";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createReportGateway } from "./report-gateway";

type Result = { data: unknown; error: { message: string } | null };
type Call = { table: string; ops: [string, unknown[]][] };

/** テーブルごとに結果を返し、呼ばれた select/フィルタを記録するモック。 */
function mockSupabase(options: {
  user?: { id: string } | null;
  authError?: { message: string } | null;
  results?: Record<string, Result>;
}) {
  const calls: Call[] = [];
  const from = (table: string) => {
    const result = options.results?.[table] ?? { data: [], error: null };
    const call: Call = { table, ops: [] };
    calls.push(call);
    const chain: Record<string, unknown> = {};
    for (const op of ["select", "eq", "gte", "lte", "order"]) {
      chain[op] = (...args: unknown[]) => {
        call.ops.push([op, args]);
        return chain;
      };
    }
    chain.maybeSingle = async () => result;
    chain.single = async () => result;
    chain.then = (resolve: (value: Result) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject);
    return chain;
  };
  const client = {
    auth: {
      getUser: async () => ({
        data: { user: options.user === undefined ? { id: "user-1" } : options.user },
        error: options.authError ?? null,
      }),
    },
    from,
  } as unknown as SupabaseClient;
  return { client, calls };
}

const ENTITLED = {
  subscriptions: { data: { status: "active", current_period_end: "2099-01-01T00:00:00Z" }, error: null },
};
const NOT_ENTITLED = { subscriptions: { data: null, error: null } };

const BOWEL_ROW = {
  id: "b1",
  logged_at: "2026-10-06T01:00:00Z", // JST 10/6（火）10:00、今週の範囲内
  hardness: 4,
  amount: "normal",
  color: "brown",
  ease: "easy",
};

describe("getWeeklyReport", () => {
  it("未ログインは null", async () => {
    const { client } = mockSupabase({ user: null });
    expect(await createReportGateway(client).getWeeklyReport()).toBeNull();
  });

  it("権利なし: ティーザーを返し、分析に使う列を一切読まない", async () => {
    const { client, calls } = mockSupabase({
      results: {
        ...NOT_ENTITLED,
        bowel_logs: {
          data: [{ logged_at: "2026-10-06T01:00:00Z" }, { logged_at: "2026-10-07T01:00:00Z" }],
          error: null,
        },
      },
    });

    const result = await createReportGateway(client).getWeeklyReport("2026-10-09T00:00:00Z");

    expect(result).toEqual({ entitled: false, teaser: { bowelCount: 2, recordedDays: 2 } });
    // 結果オブジェクトに分析値の置き場が無いこと（型でなく実データでも）。
    expect(result).not.toHaveProperty("report");
    expect(result).not.toHaveProperty("analysis");

    const bowelCall = calls.find((call) => call.table === "bowel_logs");
    // 件数・日数のために logged_at だけを読む。硬さ/量/色/出やすさを取ると
    // 「描かないだけで実値を持っている」状態になるため、ここで固定する。
    expect(bowelCall?.ops).toContainEqual(["select", ["logged_at"]]);
    // 分析用に広い範囲（4週間前）まで読まない。今週の区間だけ。
    const gte = bowelCall?.ops.find(([op]) => op === "gte")?.[1];
    expect(gte).toEqual(["logged_at", "2026-10-04T15:00:00.000Z"]); // JST 10/5（月）00:00
  });

  it("権利あり: 4週間分の記録を読み、分析を含むレポートを返す", async () => {
    const { client, calls } = mockSupabase({
      results: {
        ...ENTITLED,
        bowel_logs: { data: [BOWEL_ROW], error: null },
        meal_logs: { data: [{ eaten_at: "2026-10-06T00:00:00Z", food_groups: ["vegetable"] }], error: null },
      },
    });

    const result = await createReportGateway(client).getWeeklyReport("2026-10-09T00:00:00Z");

    expect(result?.entitled).toBe(true);
    if (!result?.entitled) return;
    expect(result.report.summary.bowelCount).toBe(1);
    expect(result.report.analysis.dailyCounts.length).toBeGreaterThan(0);

    const bowelCall = calls.find((call) => call.table === "bowel_logs");
    expect(bowelCall?.ops).toContainEqual(["select", ["id, logged_at, hardness, amount, color, ease"]]);
  });

  it("週境界が JST 月曜始まりであること（日曜は前週、月曜は今週）", async () => {
    // now = JST 2026-10-09（金）。今週の月曜は JST 10/5 00:00 = 10/4 15:00Z。
    const { client, calls } = mockSupabase({
      results: { ...ENTITLED, bowel_logs: { data: [], error: null }, meal_logs: { data: [], error: null } },
    });
    await createReportGateway(client).getWeeklyReport("2026-10-09T00:00:00Z");

    const gte = calls.find((call) => call.table === "bowel_logs")?.ops.find(([op]) => op === "gte")?.[1];
    // 直近4週間の開始 = 今週月曜 JST 10/5 - 4週 = JST 9/7 00:00 = 9/6 15:00Z
    expect(gte).toEqual(["logged_at", "2026-09-06T15:00:00.000Z"]);
  });

  it("subscriptions の読取失敗は throw（権利なしに丸めない）", async () => {
    const { client } = mockSupabase({
      results: { subscriptions: { data: null, error: { message: "denied" } } },
    });
    await expect(createReportGateway(client).getWeeklyReport()).rejects.toThrow("レポートの読み込みに失敗しました。");
  });

  it("期限切れの購読はティーザーに落ちる", async () => {
    const { client } = mockSupabase({
      results: {
        subscriptions: { data: { status: "active", current_period_end: "2020-01-01T00:00:00Z" }, error: null },
        bowel_logs: { data: [], error: null },
      },
    });
    const result = await createReportGateway(client).getWeeklyReport("2026-10-09T00:00:00Z");
    expect(result?.entitled).toBe(false);
  });
});
