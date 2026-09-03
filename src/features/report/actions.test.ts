import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import { getWeeklyReportAction } from "./actions";

const user = { id: "00000000-0000-4000-8000-000000000001" };

function createSupabase({
  userData = user,
  bowelRows = [],
  mealRows = [],
  queryError = null,
}: {
  userData?: typeof user | null;
  bowelRows?: Array<{ logged_at: string; hardness: number; amount: "small" | "normal" | "large"; color: "brown" | "dark_brown" | "yellow" | "green"; ease: "easy" | "normal" | "hard" }>;
  mealRows?: Array<{ eaten_at: string; tag: string }>;
  queryError?: { message: string } | null;
} = {}) {
  const bowelOrder = vi.fn().mockResolvedValue({ data: bowelRows, error: queryError });
  const bowelGte = vi.fn().mockReturnValue({ order: bowelOrder });
  const bowelEq = vi.fn().mockReturnValue({ gte: bowelGte });
  const bowelSelect = vi.fn().mockReturnValue({ eq: bowelEq });
  const mealOrder = vi.fn().mockResolvedValue({ data: mealRows, error: queryError });
  const mealGte = vi.fn().mockReturnValue({ order: mealOrder });
  const mealEq = vi.fn().mockReturnValue({ gte: mealGte });
  const mealSelect = vi.fn().mockReturnValue({ eq: mealEq });
  const from = vi.fn((table: string) => table === "bowel_logs"
    ? { select: bowelSelect }
    : { select: mealSelect });

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: userData }, error: null }) },
    from,
    bowelEq,
    bowelGte,
    mealEq,
    mealGte,
  };
}

describe("getWeeklyReportAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("本人の必要な期間の食事・排便記録だけから今週のレポートを作る", async () => {
    const supabase = createSupabase({
      bowelRows: [{ logged_at: "2026-09-03T03:00:00.000Z", hardness: 4, amount: "normal", color: "brown", ease: "easy" }],
      mealRows: [{ eaten_at: "2026-09-02T12:00:00.000Z", tag: "vegetable" }],
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(getWeeklyReportAction("2026-09-04T12:00:00.000Z")).resolves.toMatchObject({
      summary: { bowelCount: 1, averageHardness: 4 },
      meals: { total: 1, byTag: { vegetable: 1 } },
    });
    expect(supabase.bowelEq).toHaveBeenCalledWith("user_id", user.id);
    expect(supabase.bowelGte).toHaveBeenCalledWith("logged_at", "2026-08-09T15:00:00.000Z");
    expect(supabase.mealEq).toHaveBeenCalledWith("user_id", user.id);
    expect(supabase.mealGte).toHaveBeenCalledWith("eaten_at", "2026-08-09T15:00:00.000Z");
  });

  it("未認証時は記録を問い合わせず null を返す", async () => {
    const supabase = createSupabase({ userData: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(getWeeklyReportAction("2026-09-04T12:00:00.000Z")).resolves.toBeNull();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("読取失敗をレポートなしとして隠さない", async () => {
    const supabase = createSupabase({ queryError: { message: "RLS denied" } });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(getWeeklyReportAction("2026-09-04T12:00:00.000Z")).rejects.toThrow("レポートの読み込みに失敗しました。");
  });
});
