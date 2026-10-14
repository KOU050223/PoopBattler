import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  upsertIapSubscription: vi.fn(),
  updateIapSubscriptionByTransaction: vi.fn(),
  deleteTransferredIapSubscription: vi.fn(),
}));

vi.mock("@/lib/supabase/subscription-write", () => ({
  upsertIapSubscription: mocks.upsertIapSubscription,
  updateIapSubscriptionByTransaction: mocks.updateIapSubscriptionByTransaction,
  deleteTransferredIapSubscription: mocks.deleteTransferredIapSubscription,
}));

import { POST } from "./route";

const SECRET = "test-webhook-secret";
const USER_ID = "00000000-0000-4000-8000-000000000001";

function webhookRequest(body: unknown, authorization: string | null = SECRET) {
  const headers = new Headers();
  if (authorization !== null) headers.set("authorization", authorization);
  return new Request("https://example.test/api/iap/webhook", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function purchaseEvent(event: Record<string, unknown> = {}) {
  return {
    api_version: "1.0",
    event: {
      type: "INITIAL_PURCHASE",
      app_user_id: USER_ID,
      original_transaction_id: "otid_1",
      expiration_at_ms: 1790000000_000,
      event_timestamp_ms: 1790000500_000,
      environment: "PRODUCTION",
      ...event,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.REVENUECAT_WEBHOOK_SECRET = SECRET;
  mocks.upsertIapSubscription.mockResolvedValue({ status: "ok" });
  mocks.updateIapSubscriptionByTransaction.mockResolvedValue({ status: "ok" });
  mocks.deleteTransferredIapSubscription.mockResolvedValue({ status: "ok" });
});

describe("POST /api/iap/webhook（共有シークレット検証）", () => {
  // 正しいシークレットは受理され、違うもの・欠けたものは拒否される。
  // どちらか片方だけの検査だと「検証が素通り」と「正しく弾く」が区別できない。
  it("正しいシークレットの要求を受理する", async () => {
    const response = await POST(webhookRequest(purchaseEvent()));

    expect(response.status).toBe(200);
    expect(mocks.upsertIapSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID, status: "active" }),
    );
  });

  it("シークレットが一致しない要求を拒否する", async () => {
    const response = await POST(webhookRequest(purchaseEvent(), "wrong-secret"));

    expect(response.status).toBe(400);
    expect(mocks.upsertIapSubscription).not.toHaveBeenCalled();
  });

  it("Authorization ヘッダが無い要求を拒否する", async () => {
    const response = await POST(webhookRequest(purchaseEvent(), null));

    expect(response.status).toBe(400);
    expect(mocks.upsertIapSubscription).not.toHaveBeenCalled();
  });

  // こちらの設定漏れは再送してもらわないと権利が付かない。400 だと
  // RevenueCat は成功扱いで再送しないため 500 を返す。
  it("シークレット未設定なら再送させる", async () => {
    delete process.env.REVENUECAT_WEBHOOK_SECRET;

    const response = await POST(webhookRequest(purchaseEvent()));

    expect(response.status).toBe(500);
  });
});

describe("POST /api/iap/webhook（イベント処理）", () => {
  it("権利に関係しないイベントは受け取りだけ済ませる", async () => {
    const response = await POST(webhookRequest(purchaseEvent({ type: "TEST" })));

    expect(response.status).toBe(200);
    expect(mocks.upsertIapSubscription).not.toHaveBeenCalled();
    expect(mocks.updateIapSubscriptionByTransaction).not.toHaveBeenCalled();
  });

  // このアプリは定期購読のみ販売する。消耗型・買い切り型の購入イベントで
  // 購読行が上書きされるのを防ぐ。
  it("NON_RENEWING_PURCHASE は購読行を書き換えない", async () => {
    const response = await POST(webhookRequest(purchaseEvent({ type: "NON_RENEWING_PURCHASE" })));

    expect(response.status).toBe(200);
    expect(mocks.upsertIapSubscription).not.toHaveBeenCalled();
    expect(mocks.updateIapSubscriptionByTransaction).not.toHaveBeenCalled();
    expect(mocks.deleteTransferredIapSubscription).not.toHaveBeenCalled();
  });

  // TRANSFER は権利が別ユーザーへ移った通知。移転元の行を消さないと
  // 旧ユーザーに権利が残り、新しい持ち主の upsert が衝突し続ける。
  it("TRANSFER は移転元ユーザーの行の削除に流す", async () => {
    const fromUserId = "00000000-0000-4000-8000-000000000099";
    const response = await POST(
      webhookRequest(
        purchaseEvent({
          type: "TRANSFER",
          app_user_id: undefined,
          transferred_from: [fromUserId],
          transferred_to: [USER_ID],
        }),
      ),
    );

    expect(response.status).toBe(200);
    expect(mocks.deleteTransferredIapSubscription).toHaveBeenCalledWith({
      appleOriginalTransactionId: "otid_1",
      fromUserIds: [fromUserId],
    });
    expect(mocks.upsertIapSubscription).not.toHaveBeenCalled();
  });

  it("TRANSFER の削除に失敗したら再送させる", async () => {
    const fromUserId = "00000000-0000-4000-8000-000000000099";
    mocks.deleteTransferredIapSubscription.mockResolvedValue({ status: "error", reason: "x" });

    const response = await POST(
      webhookRequest(
        purchaseEvent({ type: "TRANSFER", transferred_from: [fromUserId] }),
      ),
    );

    expect(response.status).toBe(500);
  });

  it("必要な ID が欠けたイベントを処理済みにしない", async () => {
    const response = await POST(webhookRequest(purchaseEvent({ app_user_id: "not-a-uuid" })));

    expect(response.status).toBe(422);
    expect(mocks.upsertIapSubscription).not.toHaveBeenCalled();
  });

  it("状態遷移イベントは transaction id 突合の更新に流す", async () => {
    const response = await POST(webhookRequest(purchaseEvent({ type: "EXPIRATION" })));

    expect(response.status).toBe(200);
    expect(mocks.updateIapSubscriptionByTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        appleOriginalTransactionId: "otid_1",
        status: "expired",
      }),
    );
  });

  // 書き込みに失敗したまま 200 を返すと、権利が付かないのに
  // RevenueCat 側は成功扱いで再送しない。
  it("書き込み失敗は再送させる", async () => {
    mocks.upsertIapSubscription.mockResolvedValue({ status: "error", reason: "some_error" });

    const response = await POST(webhookRequest(purchaseEvent()));

    expect(response.status).toBe(500);
  });

  // アカウント削除済みのユーザーに対するイベントは FK 違反になる。
  // Apple の購読をこちらから解約する手段は無いため、受領して終わる。
  it("削除済みユーザーのイベントは受領して終わる", async () => {
    mocks.upsertIapSubscription.mockResolvedValue({ status: "error", reason: "23503" });

    const response = await POST(webhookRequest(purchaseEvent()));

    expect(response.status).toBe(200);
  });

  it("JSON でない body を拒否する", async () => {
    const response = await POST(webhookRequest("not-json{"));

    expect(response.status).toBe(400);
  });
});
