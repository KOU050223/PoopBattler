import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  retrieve: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock("stripe", () => ({
  default: class {
    subscriptions = { retrieve: mocks.retrieve, cancel: mocks.cancel };
  },
}));

import { cancelSubscriptionNow } from "./cancel-subscription";

const subscriptionId = "sub_test";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
  process.env.STRIPE_PRICE_ID = "price_dummy";
  process.env.NEXT_PUBLIC_APP_URL = "https://example.test";
});

describe("cancelSubscriptionNow", () => {
  // 退会時に DB 側の status を信じると、Webhook 欠落で古い行を
  // 「canceled」と読み違えて課金が残る。必ず Stripe へ取りにいく。
  it("請求を起こしうる status の購読をキャンセルする", async () => {
    mocks.retrieve.mockResolvedValue({ status: "active" });

    await expect(cancelSubscriptionNow(subscriptionId)).resolves.toBe(true);
    expect(mocks.cancel).toHaveBeenCalledWith(subscriptionId);
  });

  it.each(["trialing", "incomplete", "past_due", "unpaid", "paused"])(
    "status=%s もキャンセル対象にする",
    async (status) => {
      mocks.retrieve.mockResolvedValue({ status });

      await expect(cancelSubscriptionNow(subscriptionId)).resolves.toBe(true);
      expect(mocks.cancel).toHaveBeenCalledWith(subscriptionId);
    },
  );

  it.each(["canceled", "incomplete_expired"])(
    "終端の status=%s には cancel を呼ばない",
    async (status) => {
      mocks.retrieve.mockResolvedValue({ status });

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
    mocks.retrieve.mockResolvedValue({ status: "active" });
    mocks.cancel.mockRejectedValue(new Error("stripe down"));

    await expect(cancelSubscriptionNow(subscriptionId)).resolves.toBe(false);
  });

  it("接続情報が無いときはキャンセルにいかない", async () => {
    delete process.env.STRIPE_SECRET_KEY;

    await expect(cancelSubscriptionNow(subscriptionId)).resolves.toBe(false);
    expect(mocks.retrieve).not.toHaveBeenCalled();
  });
});
