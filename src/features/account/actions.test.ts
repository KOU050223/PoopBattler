import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  deleteUser: vi.fn(),
  retrieve: vi.fn(),
  cancel: vi.fn(),
  subscriptionsList: vi.fn(),
  sessionsList: vi.fn(),
  sessionsExpire: vi.fn(),
  customersList: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

// サービスロール側の削除は境界としてモックする。中身の検証は
// user-deletion.test.ts が担当する。
vi.mock("@/lib/supabase/user-deletion", () => ({
  deleteUserCompletely: mocks.deleteUser,
}));

vi.mock("stripe", () => ({
  default: class {
    subscriptions = {
      retrieve: mocks.retrieve,
      cancel: mocks.cancel,
      list: mocks.subscriptionsList,
    };
    checkout = {
      sessions: { list: mocks.sessionsList, expire: mocks.sessionsExpire },
    };
    customers = { list: mocks.customersList };
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

/** Stripe SDK の auto-pagination と同じ、async iterable な list の戻り値。 */
function listOf<T>(items: T[]) {
  return {
    async *[Symbol.asyncIterator]() {
      yield* items;
    },
  };
}

beforeEach(() => {
  // clearAllMocks は呼び出し履歴だけを消し、mockRejectedValue の実装は残る。
  // 前のテストの reject が次のテストへ持ち越されると偽の失敗になるため、
  // 実装ごと戻す resetAllMocks を使う。
  vi.resetAllMocks();
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy";

  mocks.deleteUser.mockResolvedValue({ status: "ok" });
  mocks.retrieve.mockResolvedValue({ id: "sub_1", status: "canceled" });
  // 既定は「開いているCheckoutも顧客も購読も無い」状態。
  mocks.sessionsList.mockReturnValue(listOf([]));
  mocks.customersList.mockReturnValue(listOf([]));
  mocks.subscriptionsList.mockReturnValue(listOf([]));
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
    expect(mocks.deleteUser).toHaveBeenCalledWith(userId);
  });

  // 「DBだけ消えて Stripe に課金が残る」を防ぐための中核の検査。
  it("購読中のユーザーは Stripe のキャンセルを先に行ってから削除する", async () => {
    mocks.createClient.mockResolvedValue(
      createSupabase(signedInUser, {
        stripe_customer_id: "cus_1",
        stripe_subscription_id: "sub_1",
      }),
    );
    mocks.subscriptionsList.mockReturnValue(listOf([{ id: "sub_1", status: "active" }]));

    await expect(deleteAccountAction()).resolves.toEqual({ status: "deleted" });

    expect(mocks.cancel).toHaveBeenCalledWith("sub_1");
    expect(mocks.deleteUser).toHaveBeenCalledWith(userId);
    expect(mocks.cancel.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.deleteUser.mock.invocationCallOrder[0]);
  });

  // Checkout を開いたまま退会すると、退会後に決済が完了して
  // アカウントの無い購読ができる。削除前にセッションを潰す。
  it("支払い途中のCheckoutを expire してから削除する", async () => {
    mocks.createClient.mockResolvedValue(createSupabase(signedInUser));
    mocks.sessionsList.mockReturnValue(listOf([
      { id: "cs_open", client_reference_id: userId, customer: null },
    ]));

    await expect(deleteAccountAction()).resolves.toEqual({ status: "deleted" });

    expect(mocks.sessionsExpire).toHaveBeenCalledWith("cs_open");
    expect(mocks.sessionsExpire.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.deleteUser.mock.invocationCallOrder[0]);
  });

  // 課金が残るか分からないままユーザーを消すと取り返しがつかない。
  // 失敗時はアカウントを残し、再試行できる状態にする。
  it("Stripe 側の停止に失敗したらユーザーを消さない", async () => {
    mocks.createClient.mockResolvedValue(
      createSupabase(signedInUser, {
        stripe_customer_id: "cus_1",
        stripe_subscription_id: "sub_1",
      }),
    );
    mocks.subscriptionsList.mockReturnValue(listOf([{ id: "sub_1", status: "active" }]));
    mocks.cancel.mockRejectedValue(new Error("stripe down"));

    await expect(deleteAccountAction()).resolves.toMatchObject({ status: "error" });
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it("Checkout セッションの expire に失敗してもユーザーを消さない", async () => {
    mocks.createClient.mockResolvedValue(createSupabase(signedInUser));
    mocks.sessionsList.mockReturnValue(listOf([
      { id: "cs_open", client_reference_id: userId, customer: null },
    ]));
    mocks.sessionsExpire.mockRejectedValue(new Error("stripe down"));

    await expect(deleteAccountAction()).resolves.toMatchObject({ status: "error" });
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  // 鍵の無い環境では Checkout も購読も作りえないため、
  // 購読履歴の無いユーザーの退会を Stripe の設定有無で塞がない。
  it("Stripe 未設定でも購読履歴の無いユーザーは削除できる", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    mocks.createClient.mockResolvedValue(createSupabase(signedInUser));

    await expect(deleteAccountAction()).resolves.toEqual({ status: "deleted" });
    expect(mocks.deleteUser).toHaveBeenCalledWith(userId);
  });

  // 購読行があるのに鍵が無いと、課金が生きているか確認できない。
  it("購読履歴があるのに Stripe 未設定なら削除を中止する", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    mocks.createClient.mockResolvedValue(
      createSupabase(signedInUser, {
        stripe_customer_id: "cus_1",
        stripe_subscription_id: "sub_1",
      }),
    );

    await expect(deleteAccountAction()).resolves.toMatchObject({ status: "error" });
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it("ユーザー削除の失敗を成功として返さない", async () => {
    mocks.createClient.mockResolvedValue(createSupabase(signedInUser));
    mocks.deleteUser.mockResolvedValue({ status: "error", reason: "delete_failed" });

    await expect(deleteAccountAction()).resolves.toMatchObject({ status: "error" });
  });
});
