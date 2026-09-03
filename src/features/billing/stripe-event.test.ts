import type Stripe from "stripe";
import { describe, expect, it } from "vitest";

import { resolveStripeEvent } from "./stripe-event";

const userId = "00000000-0000-4000-8000-000000000001";

function checkoutEvent(session: Record<string, unknown>): Stripe.Event {
  return { type: "checkout.session.completed", data: { object: session } } as unknown as Stripe.Event;
}

function subscriptionEvent(
  type: "customer.subscription.updated" | "customer.subscription.deleted",
  subscription: Record<string, unknown>,
): Stripe.Event {
  return { type, data: { object: subscription } } as unknown as Stripe.Event;
}

/** Route Handler が Stripe から取得して渡す購読。 */
function retrievedSubscription(overrides: Record<string, unknown> = {}) {
  return { status: "active", current_period_end: 1790000000, ...overrides } as unknown as Stripe.Subscription;
}

describe("resolveStripeEvent（購入）", () => {
  it("Checkout完了からユーザーIDと顧客IDを取り出す", () => {
    const outcome = resolveStripeEvent(
      checkoutEvent({ client_reference_id: userId, customer: "cus_1", subscription: "sub_1" }),
      retrievedSubscription(),
    );

    expect(outcome).toEqual({
      kind: "upsert",
      record: {
        userId,
        stripeCustomerId: "cus_1",
        stripeSubscriptionId: "sub_1",
        status: "active",
        currentPeriodEnd: new Date(1790000000 * 1000).toISOString(),
      },
    });
  });

  // 支払った直後の利用者が締め出されないための、この機能の要。
  // 期限が null の行は hasActiveEntitlement が権利なしと判定する。
  // 後続の customer.subscription.updated には頼れない（順序が保証されない）。
  it("Checkout完了の時点で期限を確定させる", () => {
    const outcome = resolveStripeEvent(
      checkoutEvent({ client_reference_id: userId, customer: "cus_1", subscription: "sub_1" }),
      retrievedSubscription(),
    );

    expect(outcome).toMatchObject({ record: { currentPeriodEnd: expect.any(String) } });
  });

  // 購読を取得できなくても、行そのものは作る。ここで諦めると
  // 支払いの記録がどこにも残らない。
  it("購読を取得できなかった場合も購読の行は作る", () => {
    const outcome = resolveStripeEvent(
      checkoutEvent({ client_reference_id: userId, customer: "cus_1", subscription: "sub_1" }),
      null,
    );

    expect(outcome).toMatchObject({ kind: "upsert", record: { currentPeriodEnd: null } });
  });

  it("顧客や購読がオブジェクトで届いてもIDを取り出す", () => {
    const outcome = resolveStripeEvent(
      checkoutEvent({
        client_reference_id: userId,
        customer: { id: "cus_1" },
        subscription: { id: "sub_1" },
      }),
      retrievedSubscription(),
    );

    expect(outcome).toMatchObject({ kind: "upsert", record: { stripeCustomerId: "cus_1" } });
  });

  // client_reference_id が無い購入は、誰の権利か決められない。
  // 200 で握り潰すとその購入は永久に反映されない。
  it("ユーザーIDの無いCheckoutを処理済みにしない", () => {
    const outcome = resolveStripeEvent(checkoutEvent({ customer: "cus_1", subscription: "sub_1" }));

    expect(outcome).toEqual({ kind: "invalid", reason: "checkout_session_missing_ids" });
  });

  it("購読IDの無いCheckoutを処理済みにしない", () => {
    const outcome = resolveStripeEvent(checkoutEvent({ client_reference_id: userId, customer: "cus_1" }));

    expect(outcome).toMatchObject({ kind: "invalid" });
  });
});

describe("resolveStripeEvent（購読の更新）", () => {
  it("購読の更新から状態と期限を取り出す", () => {
    const outcome = resolveStripeEvent(
      subscriptionEvent("customer.subscription.updated", {
        customer: "cus_1",
        status: "active",
        current_period_end: 1790000000,
      }),
    );

    expect(outcome).toEqual({
      kind: "update-by-customer",
      stripeCustomerId: "cus_1",
      status: "active",
      currentPeriodEnd: new Date(1790000000 * 1000).toISOString(),
    });
  });

  // 新しいAPIバージョンでは期限が items 側にある。片方だけを読むと
  // 期限が null のまま書かれ、課金済みの人が締め出される。
  it("期限がitems側にある形式でも取り出す", () => {
    const outcome = resolveStripeEvent(
      subscriptionEvent("customer.subscription.updated", {
        customer: "cus_1",
        status: "active",
        items: { data: [{ current_period_end: 1790000000 }] },
      }),
    );

    expect(outcome).toMatchObject({ currentPeriodEnd: new Date(1790000000 * 1000).toISOString() });
  });

  it("itemsが複数あれば権利が続く最後の時刻を採る", () => {
    const outcome = resolveStripeEvent(
      subscriptionEvent("customer.subscription.updated", {
        customer: "cus_1",
        status: "active",
        items: { data: [{ current_period_end: 1780000000 }, { current_period_end: 1790000000 }] },
      }),
    );

    expect(outcome).toMatchObject({ currentPeriodEnd: new Date(1790000000 * 1000).toISOString() });
  });

  // 解約は取りこぼしたときに「有効なまま」へ倒れてはいけない。
  it("削除イベントは状態をcanceledにする", () => {
    const outcome = resolveStripeEvent(
      subscriptionEvent("customer.subscription.deleted", {
        customer: "cus_1",
        status: "active",
        current_period_end: 1790000000,
      }),
    );

    expect(outcome).toMatchObject({ kind: "update-by-customer", status: "canceled" });
  });

  // 顧客IDだけで絞ると、同じ顧客の古い購読に対して遅れて届いた deleted が
  // 新しい有効な購読まで取り消してしまう。
  it("更新の対象を購読IDでも絞る", () => {
    const outcome = resolveStripeEvent(
      subscriptionEvent("customer.subscription.deleted", {
        id: "sub_old",
        customer: "cus_1",
        status: "canceled",
      }),
    );

    expect(outcome).toMatchObject({ stripeSubscriptionId: "sub_old" });
  });

  it("顧客IDの無い購読イベントを処理済みにしない", () => {
    const outcome = resolveStripeEvent(
      subscriptionEvent("customer.subscription.updated", { status: "active" }),
    );

    expect(outcome).toEqual({ kind: "invalid", reason: "subscription_missing_customer" });
  });

  it("期限が壊れた値なら null にする", () => {
    const outcome = resolveStripeEvent(
      subscriptionEvent("customer.subscription.updated", {
        customer: "cus_1",
        status: "active",
        current_period_end: "not-a-number",
      }),
    );

    expect(outcome).toMatchObject({ currentPeriodEnd: null });
  });
});

describe("resolveStripeEvent（その他）", () => {
  it("購読に関係しないイベントは無視する", () => {
    const event = { type: "invoice.paid", data: { object: {} } } as unknown as Stripe.Event;

    expect(resolveStripeEvent(event)).toEqual({ kind: "ignore" });
  });
});
