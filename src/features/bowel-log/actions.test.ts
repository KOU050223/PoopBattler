import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import { getBattleHistoryAction } from "./actions";

const user = { id: "00000000-0000-4000-8000-000000000001" };

type HistoryRow = {
  id: string;
  started_at: string;
  completed_at: string | null;
  companionship_result: boolean | null;
  meal_logs: { food_groups: string[] } | null;
  characters: { id: string; name: string; attribute: "curry" } | null;
  bowel_logs: { hardness: number; amount: string; color: string; ease: string } | null;
};

function createSupabase({
  userData = user,
  queryError = null,
  rows = [],
}: {
  userData?: typeof user | null;
  queryError?: { message: string } | null;
  rows?: HistoryRow[];
} = {}) {
  const order = vi.fn().mockResolvedValue({ data: rows, error: queryError });
  const statusEq = vi.fn().mockReturnValue({ order });
  const userEq = vi.fn().mockReturnValue({ eq: statusEq });
  const select = vi.fn().mockReturnValue({ eq: userEq });

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: userData }, error: null }) },
    from: vi.fn().mockReturnValue({ select }),
    select,
    userEq,
    statusEq,
    order,
  };
}

describe("getBattleHistoryAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("食事あり・なしをともに含め、本人の確定済み履歴を新しい順で返す", async () => {
    const rows: HistoryRow[] = [
      {
        id: "00000000-0000-4000-8000-000000000002",
        started_at: "2026-09-03T07:00:00.000Z",
        completed_at: "2026-09-03T07:03:00.000Z",
        companionship_result: false,
        meal_logs: null,
        characters: { id: "curry-poop", name: "カレーうんちくん", attribute: "curry" },
        bowel_logs: { hardness: 4, amount: "normal", color: "brown", ease: "easy" },
      },
      {
        id: "00000000-0000-4000-8000-000000000003",
        started_at: "2026-09-03T06:00:00.000Z",
        completed_at: "2026-09-03T06:03:00.000Z",
        companionship_result: true,
        meal_logs: { food_groups: ["fruit"] },
        characters: { id: "banana-poop", name: "バナナうんちくん", attribute: "curry" },
        bowel_logs: { hardness: 5, amount: "large", color: "yellow", ease: "normal" },
      },
    ];
    const supabase = createSupabase({ rows });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(getBattleHistoryAction()).resolves.toEqual([
      {
        battleId: rows[0].id,
        completedAt: rows[0].completed_at,
        companionshipResult: false,
        mealFoodGroups: null,
        enemy: rows[0].characters,
        bowelLog: rows[0].bowel_logs,
      },
      {
        battleId: rows[1].id,
        completedAt: rows[1].completed_at,
        companionshipResult: true,
        mealFoodGroups: ["fruit"],
        enemy: rows[1].characters,
        bowelLog: rows[1].bowel_logs,
      },
    ]);
    expect(supabase.userEq).toHaveBeenCalledWith("user_id", user.id);
    expect(supabase.statusEq).toHaveBeenCalledWith("status", "completed");
    expect(supabase.order).toHaveBeenCalledWith("completed_at", { ascending: false });
  });

  it("未認証時は履歴を問い合わせず空配列を返す", async () => {
    const supabase = createSupabase({ userData: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(getBattleHistoryAction()).resolves.toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("読取失敗を成功扱いにせず、画面の再試行UIへ渡す", async () => {
    const supabase = createSupabase({ queryError: { message: "RLS denied" } });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(getBattleHistoryAction()).rejects.toThrow("履歴の読み込みに失敗しました。");
  });
});
