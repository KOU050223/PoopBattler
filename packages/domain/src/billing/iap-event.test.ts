import { describe, expect, it } from "vitest";

import { resolveIapEvent, type IapEventLike } from "./iap-event";

const userId = "00000000-0000-4000-8000-000000000001";
const EVENT_AT_MS = 1790000500_000;
const EXPIRES_AT_MS = 1790000000_000;

function iapEvent(type: string, event: Record<string, unknown> = {}): IapEventLike {
  return {
    type,
    app_user_id: userId,
    original_transaction_id: "otid_1",
    expiration_at_ms: EXPIRES_AT_MS,
    event_timestamp_ms: EVENT_AT_MS,
    environment: "PRODUCTION",
    ...event,
  } as IapEventLike;
}

describe("resolveIapEvent（権利の付与・延長）", () => {
  it.each([
    "INITIAL_PURCHASE",
    "RENEWAL",
    "UNCANCELLATION",
    "PRODUCT_CHANGE",
  ])("%s は active として upsert する", (type) => {
    const outcome = resolveIapEvent(iapEvent(type));

    expect(outcome).toEqual({
      kind: "upsert",
      record: {
        userId,
        appleOriginalTransactionId: "otid_1",
        status: "active",
        currentPeriodEnd: new Date(EXPIRES_AT_MS).toISOString(),
        cancelAtPeriodEnd: false,
        eventCreatedAt: new Date(EVENT_AT_MS).toISOString(),
      },
    });
  });

  // 期限が null の行は hasActiveEntitlement が権利なしと判定する。
  // 支払った直後の利用者が締め出されないよう、期限を確実に拾う。
  it("expiration_at_ms を期限に変換する", () => {
    const outcome = resolveIapEvent(iapEvent("RENEWAL", { expiration_at_ms: EXPIRES_AT_MS }));

    expect(outcome).toMatchObject({
      record: { currentPeriodEnd: new Date(EXPIRES_AT_MS).toISOString() },
    });
  });

  // expiration_at_ms が無い購入イベント。null のまま書き、
  // 権利は付かない（無期限有効と読み違えない）。
  it("expiration_at_ms が無い購入は期限を null にする", () => {
    const outcome = resolveIapEvent(iapEvent("INITIAL_PURCHASE", { expiration_at_ms: null }));

    expect(outcome).toMatchObject({ record: { currentPeriodEnd: null } });
  });
});

describe("resolveIapEvent（状態遷移）", () => {
  // 自動更新を切っても権利は期限まで残る。status を動かすと
  // hasActiveEntitlement が期限前に権利なしと判定してしまう。
  it("CANCELLATION は active のまま期間末解約を立てる", () => {
    const outcome = resolveIapEvent(iapEvent("CANCELLATION"));

    expect(outcome).toEqual({
      kind: "update-by-transaction",
      appleOriginalTransactionId: "otid_1",
      status: "active",
      currentPeriodEnd: new Date(EXPIRES_AT_MS).toISOString(),
      cancelAtPeriodEnd: true,
      eventCreatedAt: new Date(EVENT_AT_MS).toISOString(),
    });
  });

  it("EXPIRATION は権利を失わせる", () => {
    const outcome = resolveIapEvent(iapEvent("EXPIRATION"));

    expect(outcome).toMatchObject({
      kind: "update-by-transaction",
      status: "expired",
      cancelAtPeriodEnd: false,
    });
  });

  it("BILLING_ISSUE は課金失敗として記録する", () => {
    const outcome = resolveIapEvent(iapEvent("BILLING_ISSUE"));

    expect(outcome).toMatchObject({
      kind: "update-by-transaction",
      status: "billing_issue",
    });
  });

  // 返金は権利の剥奪。active のまま残すと払い戻し後も使えてしまう。
  it("REFUND は権利を剥奪する", () => {
    const outcome = resolveIapEvent(iapEvent("REFUND"));

    expect(outcome).toMatchObject({
      kind: "update-by-transaction",
      status: "refunded",
      cancelAtPeriodEnd: false,
    });
  });
});

describe("resolveIapEvent（権利の移転）", () => {
  const fromUserId = "00000000-0000-4000-8000-000000000099";

  // TRANSFER は権利が別ユーザーへ移った通知。移転元の行を消さないと、
  // 旧ユーザーに権利が残り続け、新しい持ち主の upsert が unique 制約に
  // 衝突して永久に再送される。
  it("TRANSFER は移転元ユーザーの行を消す指示に変換する", () => {
    const outcome = resolveIapEvent(
      iapEvent("TRANSFER", {
        app_user_id: undefined,
        transferred_from: [fromUserId],
        transferred_to: [userId],
      }),
    );

    expect(outcome).toEqual({
      kind: "transfer",
      appleOriginalTransactionId: "otid_1",
      fromUserIds: [fromUserId],
    });
  });

  // transferred_from には RevenueCat の匿名ID（$RCAnonymousID:…）も混ざる。
  // こちらのユーザーと結び付く uuid だけを残す。
  it("TRANSFER の移転元は uuid のものだけを残す", () => {
    const outcome = resolveIapEvent(
      iapEvent("TRANSFER", {
        transferred_from: ["$RCAnonymousID:abc123", fromUserId],
      }),
    );

    expect(outcome).toMatchObject({ kind: "transfer", fromUserIds: [fromUserId] });
  });

  // 移転元が全部匿名IDなら消せる行を特定できない。再送されても同じ
  // payload で失敗し続けるだけなので受領する。
  it("移転元のユーザーを特定できない TRANSFER は受領する", () => {
    const outcome = resolveIapEvent(
      iapEvent("TRANSFER", { transferred_from: ["$RCAnonymousID:abc123"] }),
    );

    expect(outcome).toEqual({ kind: "ignore" });
  });

  // 突合キーが無いと消す行を特定できない。
  it("original_transaction_id が無い TRANSFER を処理済みにしない", () => {
    const outcome = resolveIapEvent(
      iapEvent("TRANSFER", {
        original_transaction_id: undefined,
        transferred_from: [fromUserId],
      }),
    );

    expect(outcome).toEqual({ kind: "invalid", reason: "event_missing_original_transaction_id" });
  });
});

describe("resolveIapEvent（対象外・不正なイベント）", () => {
  it.each(["TEST", "NON_RENEWING_PURCHASE", "SUBSCRIPTION_PAUSED", "SOMETHING_ELSE"])(
    "%s は権利に関係しないので無視する",
    (type) => {
      expect(resolveIapEvent(iapEvent(type))).toEqual({ kind: "ignore" });
    },
  );

  it("イベント本体が無ければ無視する", () => {
    expect(resolveIapEvent(undefined)).toEqual({ kind: "ignore" });
  });

  // app_user_id には native 側が auth.users.id を入れる前提。
  // それ以外の値では誰の権利か決められない。
  it("app_user_id が無いイベントを処理済みにしない", () => {
    const outcome = resolveIapEvent(iapEvent("INITIAL_PURCHASE", { app_user_id: undefined }));

    expect(outcome).toEqual({ kind: "invalid", reason: "event_missing_app_user_id" });
  });

  it("app_user_id が uuid でないイベントを処理済みにしない", () => {
    const outcome = resolveIapEvent(iapEvent("INITIAL_PURCHASE", { app_user_id: "anon-user-1" }));

    expect(outcome).toMatchObject({ kind: "invalid" });
  });

  // 突合キーが無いと既存行を更新できない。200 で握り潰すと状態が永久に失われる。
  it("original_transaction_id が無いイベントを処理済みにしない", () => {
    const outcome = resolveIapEvent(iapEvent("EXPIRATION", { original_transaction_id: undefined }));

    expect(outcome).toEqual({ kind: "invalid", reason: "event_missing_original_transaction_id" });
  });

  // 発生時刻が無いと順序制御が効かず、古いイベントで新しい状態を
  // 上書きしうるため受け付けない。
  it("event_timestamp_ms が無いイベントを処理済みにしない", () => {
    const outcome = resolveIapEvent(iapEvent("RENEWAL", { event_timestamp_ms: undefined }));

    expect(outcome).toEqual({ kind: "invalid", reason: "event_missing_event_timestamp_ms" });
  });
});

describe("resolveIapEvent（発生順・環境）", () => {
  // RevenueCat は配信順を保証しないため、到着順ではなく発生順を正とする。
  it("イベントの発生時刻を持ち回る", () => {
    const outcome = resolveIapEvent(iapEvent("EXPIRATION", { event_timestamp_ms: 1700000000_000 }));

    expect(outcome).toMatchObject({
      eventCreatedAt: new Date(1700000000_000).toISOString(),
    });
  });

  // サンドボックスの購入も同じ行構造で受ける。環境で弾くと
  // TestFlight 等の検証が本番と別経路になり、見落としの元になる。
  it("SANDBOX のイベントも受け付ける", () => {
    const outcome = resolveIapEvent(iapEvent("INITIAL_PURCHASE", { environment: "SANDBOX" }));

    expect(outcome).toMatchObject({ kind: "upsert" });
  });
});
