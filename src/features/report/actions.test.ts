import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import { getWeeklyReportAction } from "./actions";

const user = { id: "00000000-0000-4000-8000-000000000001" };

type BowelRow = {
  logged_at: string;
  hardness: number;
  amount: "small" | "normal" | "large";
  color: "brown" | "dark_brown" | "yellow" | "green";
  ease: "easy" | "normal" | "hard";
};

type Subscription = { status: string; current_period_end: string | null } | null;

function createSupabase({
  userData = user,
  subscription = { status: "active", current_period_end: "2026-10-01T00:00:00.000Z" } as Subscription,
  subscriptionError = null,
  bowelRows = [],
  mealRows = [],
  queryError = null,
}: {
  userData?: typeof user | null;
  subscription?: Subscription;
  subscriptionError?: { message: string } | null;
  bowelRows?: BowelRow[];
  mealRows?: Array<{ eaten_at: string; food_groups: string[] }>;
  queryError?: { message: string } | null;
} = {}) {
  const subscriptionMaybeSingle = vi
    .fn()
    .mockResolvedValue({ data: subscription, error: subscriptionError });
  const subscriptionEq = vi.fn().mockReturnValue({ maybeSingle: subscriptionMaybeSingle });
  const subscriptionSelect = vi.fn().mockReturnValue({ eq: subscriptionEq });

  // 課金済み経路: select → eq → gte → order
  const bowelOrder = vi.fn().mockResolvedValue({ data: bowelRows, error: queryError });
  // 非課金経路: select → eq → gte → lte
  const bowelLte = vi.fn().mockResolvedValue({ data: bowelRows, error: queryError });
  const bowelGte = vi.fn().mockReturnValue({ order: bowelOrder, lte: bowelLte });
  const bowelEq = vi.fn().mockReturnValue({ gte: bowelGte });
  const bowelSelect = vi.fn().mockReturnValue({ eq: bowelEq });

  const mealOrder = vi.fn().mockResolvedValue({ data: mealRows, error: queryError });
  const mealGte = vi.fn().mockReturnValue({ order: mealOrder });
  const mealEq = vi.fn().mockReturnValue({ gte: mealGte });
  const mealSelect = vi.fn().mockReturnValue({ eq: mealEq });

  const from = vi.fn((table: string) => {
    if (table === "subscriptions") return { select: subscriptionSelect };
    if (table === "bowel_logs") return { select: bowelSelect };
    return { select: mealSelect };
  });

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: userData }, error: null }) },
    from,
    bowelSelect,
    bowelEq,
    bowelGte,
    bowelLte,
    mealEq,
    mealGte,
    subscriptionEq,
  };
}

const now = "2026-09-04T12:00:00.000Z";
const bowelRow: BowelRow = {
  logged_at: "2026-09-03T03:00:00.000Z",
  hardness: 4,
  amount: "normal",
  color: "brown",
  ease: "easy",
};

describe("getWeeklyReportAction（権利あり）", () => {
  beforeEach(() => vi.clearAllMocks());

  it("本人の必要な期間の食事・排便記録だけから今週のレポートを作る", async () => {
    const supabase = createSupabase({
      bowelRows: [bowelRow],
      mealRows: [{ eaten_at: "2026-09-02T12:00:00.000Z", food_groups: ["green_yellow_vegetables"] }],
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(getWeeklyReportAction(now)).resolves.toMatchObject({
      entitled: true,
      report: {
        summary: { bowelCount: 1, averageHardness: 4 },
        meals: { total: 1, byFoodGroup: { green_yellow_vegetables: 1 } },
      },
    });
    expect(supabase.subscriptionEq).toHaveBeenCalledWith("user_id", user.id);
    expect(supabase.bowelEq).toHaveBeenCalledWith("user_id", user.id);
    expect(supabase.bowelGte).toHaveBeenCalledWith("logged_at", "2026-08-09T15:00:00.000Z");
    expect(supabase.mealEq).toHaveBeenCalledWith("user_id", user.id);
    expect(supabase.mealGte).toHaveBeenCalledWith("eaten_at", "2026-08-09T15:00:00.000Z");
  });

  it("試用中の購読でもレポートを返す", async () => {
    mocks.createClient.mockResolvedValue(
      createSupabase({
        subscription: { status: "trialing", current_period_end: "2026-10-01T00:00:00.000Z" },
        bowelRows: [bowelRow],
      }),
    );

    await expect(getWeeklyReportAction(now)).resolves.toMatchObject({ entitled: true });
  });

  it("読取失敗をレポートなしとして隠さない", async () => {
    mocks.createClient.mockResolvedValue(createSupabase({ queryError: { message: "RLS denied" } }));

    await expect(getWeeklyReportAction(now)).rejects.toThrow("レポートの読み込みに失敗しました。");
  });
});

describe("getWeeklyReportAction（権利なし）", () => {
  beforeEach(() => vi.clearAllMocks());

  // この機能の肝。非課金の結果に分析値の入る場所が無いことを、
  // 値が undefined であることではなくプロパティの不在で確かめる。
  it("購読が無いユーザーには件数だけを返し、分析値を一切含めない", async () => {
    mocks.createClient.mockResolvedValue(
      createSupabase({ subscription: null, bowelRows: [bowelRow] }),
    );

    const result = await getWeeklyReportAction(now);

    expect(result).toEqual({
      entitled: false,
      teaser: { bowelCount: 1, recordedDays: 1 },
      hasSubscription: false,
    });
    expect(result && "report" in result).toBe(false);
  });

  it("期間の切れた購読では件数だけを返す", async () => {
    mocks.createClient.mockResolvedValue(
      createSupabase({
        subscription: { status: "active", current_period_end: "2026-08-01T00:00:00.000Z" },
        bowelRows: [bowelRow],
      }),
    );

    const result = await getWeeklyReportAction(now);
    expect(result).toMatchObject({ entitled: false });
    expect(result && "report" in result).toBe(false);
  });

  // 支払いに失敗した人へ購入ボタンだけを出すと、直す手段が画面から消える。
  it("購読はあるが権利が無い場合はその旨を返す", async () => {
    mocks.createClient.mockResolvedValue(
      createSupabase({
        subscription: { status: "past_due", current_period_end: "2026-10-01T00:00:00.000Z" },
        bowelRows: [bowelRow],
      }),
    );

    await expect(getWeeklyReportAction(now)).resolves.toMatchObject({
      entitled: false,
      hasSubscription: true,
    });
  });

  it("解約済みの購読では件数だけを返す", async () => {
    mocks.createClient.mockResolvedValue(
      createSupabase({
        subscription: { status: "canceled", current_period_end: "2026-10-01T00:00:00.000Z" },
        bowelRows: [bowelRow],
      }),
    );

    await expect(getWeeklyReportAction(now)).resolves.toMatchObject({ entitled: false });
  });

  // 分析に使う列をそもそも問い合わせないことが、渡す経路を無くす一番確実な形。
  it("非課金時は硬さなど分析に使う列を問い合わせない", async () => {
    const supabase = createSupabase({ subscription: null, bowelRows: [bowelRow] });
    mocks.createClient.mockResolvedValue(supabase);

    await getWeeklyReportAction(now);

    expect(supabase.bowelSelect).toHaveBeenCalledWith("logged_at");
    expect(supabase.from).not.toHaveBeenCalledWith("meal_logs");
  });

  it("非課金時の件数は今週の範囲だけを数える", async () => {
    const supabase = createSupabase({ subscription: null });
    mocks.createClient.mockResolvedValue(supabase);

    await getWeeklyReportAction(now);

    expect(supabase.bowelGte).toHaveBeenCalledWith("logged_at", "2026-08-30T15:00:00.000Z");
    expect(supabase.bowelLte).toHaveBeenCalledWith("logged_at", now);
  });
});

describe("getWeeklyReportAction（前提の確認）", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証時は記録を問い合わせず null を返す", async () => {
    const supabase = createSupabase({ userData: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(getWeeklyReportAction(now)).resolves.toBeNull();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  // 権利の読取失敗を「権利なし」に丸めると、課金済みの利用者へ
  // 黙ってペイウォールが出る。
  it("購読の読取失敗を権利なしに丸めない", async () => {
    mocks.createClient.mockResolvedValue(
      createSupabase({ subscriptionError: { message: "RLS denied" } }),
    );

    await expect(getWeeklyReportAction(now)).rejects.toThrow("レポートの読み込みに失敗しました。");
  });
});
