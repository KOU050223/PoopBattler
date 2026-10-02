import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  checkoutCreate: vi.fn(),
  portalCreate: vi.fn(),
  subscriptionUpdate: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("stripe", () => ({
  default: class {
    checkout = { sessions: { create: mocks.checkoutCreate } };
    billingPortal = { sessions: { create: mocks.portalCreate } };
    subscriptions = { update: mocks.subscriptionUpdate };
  },
}));

import {
  cancelPremiumAction,
  createBillingPortalSessionAction,
  createCheckoutSessionAction,
  getSubscriptionSnapshotAction,
} from "./actions";

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
  // clearAllMocks は呼び出し履歴だけを消し、mockRejectedValue の実装は残る。
  // 前のテストの reject が次のテストへ持ち越されると偽の失敗になるため、
  // 実装ごと戻す resetAllMocks を使う。
  vi.resetAllMocks();
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

  it("戻り先として呼び出し元の画面を使える", async () => {
    mocks.createClient.mockResolvedValue(createSupabase(linkedUser, { stripe_customer_id: "cus_1" }));
    mocks.portalCreate.mockResolvedValue({ url: "https://billing.stripe.test/session" });

    await createBillingPortalSessionAction("/account");

    expect(mocks.portalCreate).toHaveBeenCalledWith(
      expect.objectContaining({ return_url: "https://example.test/account" }),
    );
  });

  // return_url は appUrl に連結するため、`//evil.test` のような値を通すと
  // 外部サイトへの遷移を作れてしまう。
  it("外部へ抜けうる戻り先は既定の画面に丸める", async () => {
    mocks.createClient.mockResolvedValue(createSupabase(linkedUser, { stripe_customer_id: "cus_1" }));
    mocks.portalCreate.mockResolvedValue({ url: "https://billing.stripe.test/session" });

    await createBillingPortalSessionAction("//evil.test");

    expect(mocks.portalCreate).toHaveBeenCalledWith(
      expect.objectContaining({ return_url: "https://example.test/report" }),
    );
  });
});

describe("getSubscriptionSnapshotAction", () => {
  const activeSubscription = {
    status: "active",
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  it("期限内の購読があるユーザーを subscribed と返す", async () => {
    mocks.createClient.mockResolvedValue(createSupabase(linkedUser, activeSubscription));

    await expect(getSubscriptionSnapshotAction()).resolves.toEqual({ status: "subscribed" });
  });

  it("購読の無いユーザーを not-subscribed と返す", async () => {
    mocks.createClient.mockResolvedValue(createSupabase(linkedUser, null));

    await expect(getSubscriptionSnapshotAction()).resolves.toEqual({ status: "not-subscribed" });
  });

  it("期限切れの購読を subscribed と返さない", async () => {
    mocks.createClient.mockResolvedValue(
      createSupabase(linkedUser, { status: "active", current_period_end: "2020-01-01T00:00:00.000Z" }),
    );

    await expect(getSubscriptionSnapshotAction()).resolves.toEqual({ status: "lapsed" });
  });

  // 支払いに失敗した人は購読の行を持つ。ここを not-subscribed と見なすと
  // 支払い方法を直す導線が画面から消える。
  it("行はあるが権利の無い購読を lapsed と返す", async () => {
    mocks.createClient.mockResolvedValue(
      createSupabase(linkedUser, {
        status: "past_due",
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    );

    await expect(getSubscriptionSnapshotAction()).resolves.toEqual({ status: "lapsed" });
  });

  it("未サインインを not-subscribed と誤判定しない", async () => {
    mocks.createClient.mockResolvedValue(createSupabase(null));

    await expect(getSubscriptionSnapshotAction()).resolves.toEqual({ status: "unknown" });
  });

  // DBエラーを「未購読」と見なすと、購読中なのに解約導線が消える。
  it("購読行の読み取りに失敗したら unknown と返す", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: "db down" } });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: linkedUser }, error: null }) },
      from: vi.fn().mockReturnValue({ select }),
    });

    await expect(getSubscriptionSnapshotAction()).resolves.toEqual({ status: "unknown" });
  });
});

describe("cancelPremiumAction", () => {
  const activeSubscription = {
    status: "active",
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    stripe_subscription_id: "sub_1",
  };

  // 払い済みの期間は残す。即時 cancel だと期間途中で権利が消えて
  // 「払ったのに使えない」になる。
  it("期間末での解約を予約する（即時キャンセルではない）", async () => {
    mocks.createClient.mockResolvedValue(createSupabase(linkedUser, activeSubscription));

    await expect(cancelPremiumAction()).resolves.toMatchObject({
      status: "scheduled",
      periodEnd: activeSubscription.current_period_end,
    });
    expect(mocks.subscriptionUpdate).toHaveBeenCalledWith("sub_1", {
      cancel_at_period_end: true,
    });
  });

  it("購読の無いユーザーは not-subscribed と返し Stripe を触らない", async () => {
    mocks.createClient.mockResolvedValue(createSupabase(linkedUser, null));

    await expect(cancelPremiumAction()).resolves.toEqual({ status: "not-subscribed" });
    expect(mocks.subscriptionUpdate).not.toHaveBeenCalled();
  });

  it("期限切れの購読には解約を予約しない", async () => {
    mocks.createClient.mockResolvedValue(
      createSupabase(linkedUser, {
        ...activeSubscription,
        current_period_end: "2020-01-01T00:00:00.000Z",
      }),
    );

    await expect(cancelPremiumAction()).resolves.toEqual({ status: "not-subscribed" });
    expect(mocks.subscriptionUpdate).not.toHaveBeenCalled();
  });

  it("未サインインでは解約しない", async () => {
    mocks.createClient.mockResolvedValue(createSupabase(null));

    await expect(cancelPremiumAction()).resolves.toMatchObject({ status: "error" });
    expect(mocks.subscriptionUpdate).not.toHaveBeenCalled();
  });

  // 解約に必要なのは secret key だけ。販売停止後（priceId 等を外した環境）でも
  // 購読者は解約できなければならない。
  it("Checkout 用の設定が無くても解約できる", async () => {
    delete process.env.STRIPE_PRICE_ID;
    delete process.env.NEXT_PUBLIC_APP_URL;
    mocks.createClient.mockResolvedValue(createSupabase(linkedUser, activeSubscription));

    await expect(cancelPremiumAction()).resolves.toMatchObject({ status: "scheduled" });
    expect(mocks.subscriptionUpdate).toHaveBeenCalled();
  });

  it("Stripe 側の失敗を成功として返さない", async () => {
    mocks.createClient.mockResolvedValue(createSupabase(linkedUser, activeSubscription));
    mocks.subscriptionUpdate.mockRejectedValue(new Error("stripe down"));

    await expect(cancelPremiumAction()).resolves.toMatchObject({ status: "error" });
  });
});
