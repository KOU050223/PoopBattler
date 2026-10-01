import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  retrieve: vi.fn(),
  cancel: vi.fn(),
  subscriptionsList: vi.fn(),
  sessionsList: vi.fn(),
  sessionsExpire: vi.fn(),
  customersList: vi.fn(),
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

import { cancelSubscriptionNow, closeUserBilling } from "./cancel-subscription";

const subscriptionId = "sub_test";
const userId = "00000000-0000-4000-8000-000000000001";

/** Stripe SDK の auto-pagination と同じ、async iterable な list の戻り値。 */
function listOf<T>(items: T[]) {
  return {
    async *[Symbol.asyncIterator]() {
      yield* items;
    },
  };
}

const baseParams = {
  userId,
  email: "user@example.com",
  stripeCustomerId: "cus_1",
  stripeSubscriptionId: subscriptionId,
};

beforeEach(() => {
  // clearAllMocks は呼び出し履歴だけを消し、mockRejectedValue の実装は残る。
  // 前のテストの reject が次のテストへ持ち越されると偽の失敗になるため、
  // 実装ごと戻す resetAllMocks を使う。
  vi.resetAllMocks();
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy";

  // 既定は「何も残っていない」状態。
  mocks.sessionsList.mockReturnValue(listOf([]));
  mocks.customersList.mockReturnValue(listOf([]));
  mocks.subscriptionsList.mockReturnValue(listOf([]));
  mocks.retrieve.mockResolvedValue({ id: subscriptionId, status: "canceled" });
});

describe("cancelSubscriptionNow", () => {
  // 退会時に DB 側の status を信じると、Webhook 欠落で古い行を
  // 「canceled」と読み違えて課金が残る。必ず Stripe へ取りにいく。
  it("請求を起こしうる status の購読をキャンセルする", async () => {
    mocks.retrieve.mockResolvedValue({ id: subscriptionId, status: "active" });

    await expect(cancelSubscriptionNow(subscriptionId)).resolves.toBe(true);
    expect(mocks.cancel).toHaveBeenCalledWith(subscriptionId);
  });

  it.each(["trialing", "incomplete", "past_due", "unpaid", "paused"])(
    "status=%s もキャンセル対象にする",
    async (status) => {
      mocks.retrieve.mockResolvedValue({ id: subscriptionId, status });

      await expect(cancelSubscriptionNow(subscriptionId)).resolves.toBe(true);
      expect(mocks.cancel).toHaveBeenCalledWith(subscriptionId);
    },
  );

  it.each(["canceled", "incomplete_expired"])(
    "終端の status=%s には cancel を呼ばない",
    async (status) => {
      mocks.retrieve.mockResolvedValue({ id: subscriptionId, status });

      await expect(cancelSubscriptionNow(subscriptionId)).resolves.toBe(true);
      // 終端の購読に cancel を投げると Stripe がエラーを返し、
      // 退会そのものが失敗扱いになる。
      expect(mocks.cancel).not.toHaveBeenCalled();
    },
  );

  // retrieve と cancel のあいだに購読が消える競合も同じコードで来る。
  it("購読そのものが無い場合はキャンセル済みとして扱う", async () => {
    mocks.retrieve.mockRejectedValue(Object.assign(new Error("gone"), { code: "resource_missing" }));

    await expect(cancelSubscriptionNow(subscriptionId)).resolves.toBe(true);
  });

  // 「消えたかもしれない」で進めると課金だけが残る。失敗は失敗として返す。
  it("Stripe の失敗を成功として返さない", async () => {
    mocks.retrieve.mockRejectedValue(new Error("stripe down"));

    await expect(cancelSubscriptionNow(subscriptionId)).resolves.toBe(false);
  });

  it("cancel の失敗を成功として返さない", async () => {
    mocks.retrieve.mockResolvedValue({ id: subscriptionId, status: "active" });
    mocks.cancel.mockRejectedValue(new Error("stripe down"));

    await expect(cancelSubscriptionNow(subscriptionId)).resolves.toBe(false);
  });

  it("接続情報が無いときはキャンセルにいかない", async () => {
    delete process.env.STRIPE_SECRET_KEY;

    await expect(cancelSubscriptionNow(subscriptionId)).resolves.toBe(false);
    expect(mocks.retrieve).not.toHaveBeenCalled();
  });
});

describe("closeUserBilling", () => {
  // Checkout を開いたまま退会すると、退会後に決済が完了して
  // 「アカウントの無い購読」ができる。open のセッションは先に潰す。
  it("本人の開いているCheckoutセッションを expire する", async () => {
    mocks.sessionsList.mockReturnValue(listOf([
      { id: "cs_mine", client_reference_id: userId, customer: null },
      { id: "cs_other", client_reference_id: "other-user", customer: null },
    ]));

    await expect(closeUserBilling(baseParams)).resolves.toBe("closed");
    expect(mocks.sessionsExpire).toHaveBeenCalledTimes(1);
    expect(mocks.sessionsExpire).toHaveBeenCalledWith("cs_mine");
  });

  it("顧客IDで結びつくCheckoutセッションも expire する", async () => {
    mocks.sessionsList.mockReturnValue(listOf([
      { id: "cs_customer", client_reference_id: null, customer: "cus_1" },
    ]));

    await expect(closeUserBilling(baseParams)).resolves.toBe("closed");
    expect(mocks.sessionsExpire).toHaveBeenCalledWith("cs_customer");
  });

  // DB の subscriptions 行は Webhook が書いた時点の記録でしかない。
  // Webhook欠落・2回目の購入で行が追いついていなくても、
  // 顧客から辿れる購読はすべて止める。
  it("顧客から辿った購読をすべてキャンセルする", async () => {
    mocks.customersList.mockReturnValue(listOf([{ id: "cus_by_email" }]));
    mocks.subscriptionsList.mockReturnValue(listOf([
      { id: "sub_live", status: "active" },
      { id: "sub_dead", status: "canceled" },
    ]));

    await expect(closeUserBilling(baseParams)).resolves.toBe("closed");

    // cus_1（DBの顧客）と cus_by_email（メールで引いた顧客）の2回 list する。
    expect(mocks.subscriptionsList).toHaveBeenCalledTimes(2);
    expect(mocks.cancel).toHaveBeenCalledWith("sub_live");
    expect(mocks.cancel).not.toHaveBeenCalledWith("sub_dead");
  });

  it("DBにだけ記録がある購読IDもキャンセルする", async () => {
    mocks.retrieve.mockResolvedValue({ id: subscriptionId, status: "trialing" });

    await expect(closeUserBilling(baseParams)).resolves.toBe("closed");
    expect(mocks.retrieve).toHaveBeenCalledWith(subscriptionId);
    expect(mocks.cancel).toHaveBeenCalledWith(subscriptionId);
  });

  it("購読の痕跡が無いユーザーはそのまま closed を返す", async () => {
    await expect(
      closeUserBilling({
        userId,
        email: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      }),
    ).resolves.toBe("closed");

    expect(mocks.cancel).not.toHaveBeenCalled();
    expect(mocks.customersList).not.toHaveBeenCalled();
  });

  // 課金が残っているか分からないまま削除へ進ませない。
  it("Stripe のどこかで失敗したら failed を返す", async () => {
    mocks.sessionsList.mockReturnValue({
      async *[Symbol.asyncIterator]() {
        throw new Error("stripe down");
      },
    });

    await expect(closeUserBilling(baseParams)).resolves.toBe("failed");
  });

  it("expire に失敗しても先へ進まない", async () => {
    mocks.sessionsList.mockReturnValue(listOf([
      { id: "cs_mine", client_reference_id: userId, customer: null },
    ]));
    mocks.sessionsExpire.mockRejectedValue(new Error("stripe down"));

    await expect(closeUserBilling(baseParams)).resolves.toBe("failed");
  });

  // 鍵の無い環境では Checkout も購読も作りえない。
  // 「何も止める必要が無い」と「止められなかった」を区別するために
  // failed ではなく専用の結果を返す。
  it("鍵が無いときは unconfigured を返す", async () => {
    delete process.env.STRIPE_SECRET_KEY;

    await expect(closeUserBilling(baseParams)).resolves.toBe("unconfigured");
    expect(mocks.sessionsList).not.toHaveBeenCalled();
  });
});
