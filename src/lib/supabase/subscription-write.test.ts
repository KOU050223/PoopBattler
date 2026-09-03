import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));

import { updateSubscriptionStatusByCustomer, upsertSubscription } from "./subscription-write";

function createSupabase({
  updatedRows = [{ id: "row-1" }],
  error = null,
  existingRow = null,
}: {
  updatedRows?: Array<{ id: string }> | null;
  error?: { code: string } | null;
  /** 更新が0行だったときに、行自体は存在するかを表す。 */
  existingRow?: { id: string } | null;
} = {}) {
  // update 側: update → eq → eq → or → select
  const select = vi.fn().mockResolvedValue({ data: updatedRows, error });
  const or = vi.fn().mockReturnValue({ select });
  const eqSubscription = vi.fn().mockReturnValue({ or });
  const eqCustomer = vi.fn().mockReturnValue({ eq: eqSubscription });
  const update = vi.fn().mockReturnValue({ eq: eqCustomer });

  // 存在確認側: select → eq → eq → maybeSingle
  const maybeSingle = vi.fn().mockResolvedValue({ data: existingRow, error: null });
  const probeEqSub = vi.fn().mockReturnValue({ maybeSingle });
  const probeEqCus = vi.fn().mockReturnValue({ eq: probeEqSub });
  const selectProbe = vi.fn().mockReturnValue({ eq: probeEqCus });

  const upsert = vi.fn().mockResolvedValue({ error });

  return {
    client: { from: vi.fn().mockReturnValue({ update, upsert, select: selectProbe }) },
    update,
    upsert,
    eqCustomer,
    eqSubscription,
    or,
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
    eventCreatedAt: "2026-09-04T12:00:00.000Z",
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
    mocks.createClient.mockReturnValue(
      createSupabase({ updatedRows: [], existingRow: null }).client,
    );

    await expect(updateSubscriptionStatusByCustomer(args)).resolves.toEqual({
      status: "error",
      reason: "subscription_not_found",
    });
  });

  // Stripe は配信順を保証しない。解約済みの行を古い updated が active へ
  // 戻すと、権利が復活したまま残り、失敗として気づけない。
  it("発生時刻が古いイベントで上書きしない", async () => {
    const supabase = createSupabase();
    mocks.createClient.mockReturnValue(supabase.client);

    await updateSubscriptionStatusByCustomer(args);

    expect(supabase.or).toHaveBeenCalledWith(
      `last_event_at.is.null,last_event_at.lt.${args.eventCreatedAt}`,
    );
  });

  // 0行には2つの意味がある。「より新しいイベントで更新済み」を再送させると
  // 永久に失敗し続けるため、行の有無で切り分ける。
  it("より新しいイベントが適用済みの場合は再送させない", async () => {
    mocks.createClient.mockReturnValue(
      createSupabase({ updatedRows: [], existingRow: { id: "row-1" } }).client,
    );

    await expect(updateSubscriptionStatusByCustomer(args)).resolves.toEqual({ status: "ok" });
  });
});
