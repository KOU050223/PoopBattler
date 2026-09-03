import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  checkoutCreate: vi.fn(),
  portalCreate: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("stripe", () => ({
  default: class {
    checkout = { sessions: { create: mocks.checkoutCreate } };
    billingPortal = { sessions: { create: mocks.portalCreate } };
  },
}));

import { createBillingPortalSessionAction, createCheckoutSessionAction } from "./actions";

const userId = "00000000-0000-4000-8000-000000000001";

const linkedUser = {
  id: userId,
  is_anonymous: false,
  email: "user@example.com",
  identities: [{ provider: "google" }],
};

const anonymousUser = { id: userId, is_anonymous: true, email: null, identities: [] };

/** メールで昇格したが Google は未連携、という状態。 */
const emailOnlyUser = {
  id: userId,
  is_anonymous: false,
  email: "user@example.com",
  identities: [{ provider: "email" }],
};

function createSupabase(
  user: unknown,
  subscription: Record<string, unknown> | null = null,
) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: subscription, error: null });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
    from: vi.fn().mockReturnValue({ select }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
  process.env.STRIPE_PRICE_ID = "price_dummy";
  process.env.NEXT_PUBLIC_APP_URL = "https://example.test";
});

describe("createCheckoutSessionAction", () => {
  // 匿名のまま購入させると、端末を変えた時点で権利が復元できない。
  // UI側の分岐ではなく、この関数が境界を持つことを固定する。
  it("匿名ユーザーの購入を拒否する", async () => {
    mocks.createClient.mockResolvedValue(createSupabase(anonymousUser));

    await expect(createCheckoutSessionAction()).resolves.toMatchObject({ status: "link-required" });
    expect(mocks.checkoutCreate).not.toHaveBeenCalled();
  });

  it("Google未連携のユーザーの購入を拒否する", async () => {
    mocks.createClient.mockResolvedValue(createSupabase(emailOnlyUser));

    await expect(createCheckoutSessionAction()).resolves.toMatchObject({ status: "link-required" });
    expect(mocks.checkoutCreate).not.toHaveBeenCalled();
  });

  it("未サインインの購入を拒否する", async () => {
    mocks.createClient.mockResolvedValue(createSupabase(null));

    await expect(createCheckoutSessionAction()).resolves.toMatchObject({ status: "link-required" });
    expect(mocks.checkoutCreate).not.toHaveBeenCalled();
  });

  // 2回押すと2つ目の定期購読ができ、二重に請求される。
  it("すでに購読中のユーザーには決済ページを作らない", async () => {
    mocks.createClient.mockResolvedValue(
      createSupabase(linkedUser, {
        status: "active",
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    );

    await expect(createCheckoutSessionAction()).resolves.toMatchObject({
      status: "already-subscribed",
    });
    expect(mocks.checkoutCreate).not.toHaveBeenCalled();
  });

  // 期限切れは「購読中」ではない。ここを塞ぐと再開できなくなる。
  it("期限の切れた購読のユーザーは購入し直せる", async () => {
    mocks.createClient.mockResolvedValue(
      createSupabase(linkedUser, {
        status: "active",
        current_period_end: "2020-01-01T00:00:00.000Z",
      }),
    );
    mocks.checkoutCreate.mockResolvedValue({ url: "https://checkout.stripe.test/session" });

    await expect(createCheckoutSessionAction()).resolves.toMatchObject({ status: "redirecting" });
  });

  it("連携済みのユーザーには決済ページのURLを返す", async () => {
    mocks.createClient.mockResolvedValue(createSupabase(linkedUser));
    mocks.checkoutCreate.mockResolvedValue({ url: "https://checkout.stripe.test/session" });

    await expect(createCheckoutSessionAction()).resolves.toEqual({
      status: "redirecting",
      url: "https://checkout.stripe.test/session",
    });
  });

  // メールは Google 側で変更されうるため、照合キーにしない。
  it("購入者の対応付けにユーザーIDを渡す", async () => {
    mocks.createClient.mockResolvedValue(createSupabase(linkedUser));
    mocks.checkoutCreate.mockResolvedValue({ url: "https://checkout.stripe.test/session" });

    await createCheckoutSessionAction();

    expect(mocks.checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        client_reference_id: userId,
        subscription_data: { metadata: { supabase_user_id: userId } },
      }),
    );
  });

  it("Stripeの設定が無いときは決済ページを作りにいかない", async () => {
    delete process.env.STRIPE_PRICE_ID;
    mocks.createClient.mockResolvedValue(createSupabase(linkedUser));

    await expect(createCheckoutSessionAction()).resolves.toMatchObject({ status: "error" });
    expect(mocks.checkoutCreate).not.toHaveBeenCalled();
  });

  it("Stripe側の失敗を成功として扱わない", async () => {
    mocks.createClient.mockResolvedValue(createSupabase(linkedUser));
    mocks.checkoutCreate.mockRejectedValue(new Error("stripe down"));

    await expect(createCheckoutSessionAction()).resolves.toMatchObject({ status: "error" });
  });

  // URL の無いセッションへ遷移させると、利用者には無反応に見える。
  it("URLの無いセッションを成功として返さない", async () => {
    mocks.createClient.mockResolvedValue(createSupabase(linkedUser));
    mocks.checkoutCreate.mockResolvedValue({ url: null });

    await expect(createCheckoutSessionAction()).resolves.toMatchObject({ status: "error" });
  });
});

describe("createBillingPortalSessionAction", () => {
  it("購読があるユーザーには管理ページのURLを返す", async () => {
    mocks.createClient.mockResolvedValue(createSupabase(linkedUser, { stripe_customer_id: "cus_1" }));
    mocks.portalCreate.mockResolvedValue({ url: "https://billing.stripe.test/session" });

    await expect(createBillingPortalSessionAction()).resolves.toEqual({
      status: "redirecting",
      url: "https://billing.stripe.test/session",
    });
    expect(mocks.portalCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_1" }),
    );
  });

  it("購読が無いユーザーには管理ページを開かない", async () => {
    mocks.createClient.mockResolvedValue(createSupabase(linkedUser, null));

    await expect(createBillingPortalSessionAction()).resolves.toMatchObject({ status: "error" });
    expect(mocks.portalCreate).not.toHaveBeenCalled();
  });
});
