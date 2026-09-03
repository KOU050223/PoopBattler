import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));

import { updateSubscriptionStatusByCustomer, upsertSubscription } from "./subscription-write";

function createSupabase({
  updatedRows = [{ id: "row-1" }],
  error = null,
}: { updatedRows?: Array<{ id: string }> | null; error?: { code: string } | null } = {}) {
  const select = vi.fn().mockResolvedValue({ data: updatedRows, error });
  const eqSubscription = vi.fn().mockReturnValue({ select });
  const eqCustomer = vi.fn().mockReturnValue({ eq: eqSubscription });
  const update = vi.fn().mockReturnValue({ eq: eqCustomer });
  const upsert = vi.fn().mockResolvedValue({ error });

  return {
    client: { from: vi.fn().mockReturnValue({ update, upsert }) },
    update,
    upsert,
    eqCustomer,
    eqSubscription,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service_role_test";
});

const record = {
  userId: "00000000-0000-4000-8000-000000000001",
  stripeCustomerId: "cus_1",
  stripeSubscriptionId: "sub_1",
  status: "active",
  currentPeriodEnd: "2026-10-01T00:00:00.000Z",
};

describe("upsertSubscription", () => {
  it("ユーザーごとに1行として書き込む", async () => {
    const supabase = createSupabase();
    mocks.createClient.mockReturnValue(supabase.client);

    await expect(upsertSubscription(record)).resolves.toEqual({ status: "ok" });
    expect(supabase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: record.userId, status: "active" }),
      { onConflict: "user_id" },
    );
  });

  it("書き込みの失敗を成功として扱わない", async () => {
    mocks.createClient.mockReturnValue(createSupabase({ error: { code: "23505" } }).client);

    await expect(upsertSubscription(record)).resolves.toMatchObject({ status: "error" });
  });
});

describe("updateSubscriptionStatusByCustomer", () => {
  const args = {
    stripeCustomerId: "cus_1",
    stripeSubscriptionId: "sub_1",
    status: "canceled",
    currentPeriodEnd: null,
  };

  it("該当する購読を更新する", async () => {
    const supabase = createSupabase();
    mocks.createClient.mockReturnValue(supabase.client);

    await expect(updateSubscriptionStatusByCustomer(args)).resolves.toEqual({ status: "ok" });
  });

  // 顧客IDだけで絞ると、同じ顧客の古い購読に対して遅れて届いた deleted が
  // 新しい有効な購読まで取り消してしまう。
  it("顧客IDと購読IDの両方で対象を絞る", async () => {
    const supabase = createSupabase();
    mocks.createClient.mockReturnValue(supabase.client);

    await updateSubscriptionStatusByCustomer(args);

    expect(supabase.eqCustomer).toHaveBeenCalledWith("stripe_customer_id", "cus_1");
    expect(supabase.eqSubscription).toHaveBeenCalledWith("stripe_subscription_id", "sub_1");
  });

  // Stripe はイベントの順序を保証しない。Checkout より先に購読イベントが着くと
  // 更新対象がまだ無い。そこで ok を返すと Stripe は再送せず、更新が永久に失われる。
  it("対象の行が無い場合を成功として扱わない", async () => {
    mocks.createClient.mockReturnValue(createSupabase({ updatedRows: [] }).client);

    await expect(updateSubscriptionStatusByCustomer(args)).resolves.toEqual({
      status: "error",
      reason: "subscription_not_found",
    });
  });
});
