import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  deleteUser: vi.fn(),
  retrieve: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

// サービスロール側の削除は境界としてモックする。中身の検証は
// user-deletion.test.ts が担当する。
vi.mock("@/lib/supabase/user-deletion", () => ({
  deleteUserCompletely: mocks.deleteUser,
}));

vi.mock("stripe", () => ({
  default: class {
    subscriptions = { retrieve: mocks.retrieve, cancel: mocks.cancel };
  },
}));

import { deleteAccountAction } from "./actions";

const userId = "00000000-0000-4000-8000-000000000001";
const signedInUser = { id: userId, is_anonymous: true, email: null, identities: [] };

function createSupabase(
  user: unknown,
  subscription: Record<string, unknown> | null = null,
) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: subscription, error: null });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn().mockReturnValue({ select }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
  process.env.STRIPE_PRICE_ID = "price_dummy";
  process.env.NEXT_PUBLIC_APP_URL = "https://example.test";

  mocks.deleteUser.mockResolvedValue({ status: "ok" });
  mocks.retrieve.mockResolvedValue({ status: "canceled" });
});

describe("deleteAccountAction", () => {
  it("未サインインでは削除にいかない", async () => {
    mocks.createClient.mockResolvedValue(createSupabase(null));

    await expect(deleteAccountAction()).resolves.toMatchObject({ status: "error" });
    expect(mocks.retrieve).not.toHaveBeenCalled();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it("購読の無いユーザーはそのまま削除する", async () => {
    mocks.createClient.mockResolvedValue(createSupabase(signedInUser));

    await expect(deleteAccountAction()).resolves.toEqual({ status: "deleted" });
    expect(mocks.retrieve).not.toHaveBeenCalled();
    expect(mocks.deleteUser).toHaveBeenCalledWith(userId);
  });

  // 「DBだけ消えて Stripe に課金が残る」を防ぐための中核の検査。
  it("購読中のユーザーは Stripe のキャンセルを先に行ってから削除する", async () => {
    mocks.createClient.mockResolvedValue(
      createSupabase(signedInUser, { stripe_subscription_id: "sub_1" }),
    );
    mocks.retrieve.mockResolvedValue({ status: "active" });

    await expect(deleteAccountAction()).resolves.toEqual({ status: "deleted" });

    expect(mocks.cancel).toHaveBeenCalledWith("sub_1");
    expect(mocks.deleteUser).toHaveBeenCalledWith(userId);
    expect(mocks.cancel.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.deleteUser.mock.invocationCallOrder[0]);
  });

  it("Stripe 側が終端なら cancel せず削除に進む", async () => {
    mocks.createClient.mockResolvedValue(
      createSupabase(signedInUser, { stripe_subscription_id: "sub_1" }),
    );
    mocks.retrieve.mockResolvedValue({ status: "canceled" });

    await expect(deleteAccountAction()).resolves.toEqual({ status: "deleted" });
    expect(mocks.cancel).not.toHaveBeenCalled();
    expect(mocks.deleteUser).toHaveBeenCalledWith(userId);
  });

  // 課金が残るか分からないままユーザーを消すと取り返しがつかない。
  // 失敗時はアカウントを残し、再試行できる状態にする。
  it("Stripe のキャンセルに失敗したらユーザーを消さない", async () => {
    mocks.createClient.mockResolvedValue(
      createSupabase(signedInUser, { stripe_subscription_id: "sub_1" }),
    );
    mocks.retrieve.mockRejectedValue(new Error("stripe down"));

    await expect(deleteAccountAction()).resolves.toMatchObject({ status: "error" });
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  // 1回目の退会でキャンセルまで済んで削除に失敗し、2回目に来た場合。
  // Stripe 側は canceled なので cancel は飛ばして削除だけをやり直せる。
  it("キャンセル済みの購読への再試行でも削除まで進む", async () => {
    mocks.createClient.mockResolvedValue(
      createSupabase(signedInUser, { stripe_subscription_id: "sub_1" }),
    );
    mocks.retrieve.mockRejectedValue(
      Object.assign(new Error("gone"), { code: "resource_missing" }),
    );

    await expect(deleteAccountAction()).resolves.toEqual({ status: "deleted" });
    expect(mocks.deleteUser).toHaveBeenCalledWith(userId);
  });

  it("ユーザー削除の失敗を成功として返さない", async () => {
    mocks.createClient.mockResolvedValue(createSupabase(signedInUser));
    mocks.deleteUser.mockResolvedValue({ status: "error", reason: "delete_failed" });

    await expect(deleteAccountAction()).resolves.toMatchObject({ status: "error" });
  });
});
