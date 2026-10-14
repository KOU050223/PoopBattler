import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));

import {
  deleteTransferredIapSubscription,
  updateIapSubscriptionByTransaction,
  updateSubscriptionStatusByCustomer,
  upsertIapSubscription,
  upsertSubscription,
} from "./subscription-write";

// supabase-js のクエリビルダを模すモック。
// 実コードは from → select/update/delete → eq → or → … とメソッドチェーンして
// await する。どのメソッドを呼んでも自分自身を返し、await されると設定した
// 結果に解決する thenable なビルダで、呼ばれたメソッドと引数をすべて記録する。
// チェーンの形を変えたときモック側の手直しで検査が素通りにならないよう、
// 個別の jest 風チェーンではなく記録式にしている。

type QueryResult = { data?: unknown; error?: { code?: string } | null };

type Call = { method: string; args: unknown[] };

function createQuery(result: QueryResult) {
  const calls: Call[] = [];
  const query: unknown = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") {
          return (
            resolve: (value: QueryResult) => void,
            reject: (reason: unknown) => void,
          ) => Promise.resolve(result).then(resolve, reject);
        }
        return (...args: unknown[]) => {
          calls.push({ method: String(prop), args });
          return query;
        };
      },
    },
  );
  return { query, calls };
}

/** from() ごとに新しいビルダを返す。結果は呼び出し順に results から割り当てる。 */
function createSupabase(results: QueryResult[] = []) {
  const queries: Call[][] = [];
  const client = {
    from: vi.fn(() => {
      const { query, calls } = createQuery(
        results[queries.length] ?? { data: null, error: null },
      );
      queries.push(calls);
      return query;
    }),
  };
  return { client, queries };
}

/** クエリ内で method が呼ばれたときの引数一覧を返す。 */
function methodCalls(calls: Call[], method: string): unknown[][] {
  return calls.filter((c) => c.method === method).map((c) => c.args);
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
  cancelAtPeriodEnd: false,
};

describe("upsertSubscription", () => {
  it("ユーザーごとに1行として書き込む", async () => {
    const supabase = createSupabase([{ error: null }]);
    mocks.createClient.mockReturnValue(supabase.client);

    await expect(upsertSubscription(record)).resolves.toEqual({ status: "ok" });
    const upsertArgs = methodCalls(supabase.queries[0] ?? [], "upsert")[0];
    expect(upsertArgs?.[0]).toMatchObject({
      user_id: record.userId,
      provider: "stripe",
      stripe_customer_id: "cus_1",
      stripe_subscription_id: "sub_1",
      status: "active",
    });
    expect(upsertArgs?.[1]).toEqual({ onConflict: "user_id" });
  });

  // プロバイダ切替で相手側のID列を消すと、Apple 側に生きた購読が残る
  // 利用者の管理・解約導線が切れる。列は保持し、誤突合は update 側の
  // provider 条件で防ぐ。
  it("相手プロバイダのID列を書き換えない", async () => {
    const supabase = createSupabase([{ error: null }]);
    mocks.createClient.mockReturnValue(supabase.client);

    await upsertSubscription(record);

    const payload = methodCalls(supabase.queries[0] ?? [], "upsert")[0]?.[0];
    expect(payload).not.toHaveProperty("apple_original_transaction_id");
  });

  it("書き込みの失敗を成功として扱わない", async () => {
    mocks.createClient.mockReturnValue(createSupabase([{ error: { code: "23505" } }]).client);

    await expect(upsertSubscription(record)).resolves.toMatchObject({ status: "error" });
  });
});

describe("updateSubscriptionStatusByCustomer", () => {
  const args = {
    stripeCustomerId: "cus_1",
    stripeSubscriptionId: "sub_1",
    status: "canceled",
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    eventCreatedAt: "2026-09-04T12:00:00.000Z",
  };

  it("該当する購読を更新する", async () => {
    const supabase = createSupabase([{ data: [{ id: "row-1" }], error: null }]);
    mocks.createClient.mockReturnValue(supabase.client);

    await expect(updateSubscriptionStatusByCustomer(args)).resolves.toEqual({ status: "ok" });
  });

  // 期間末解約の予約は status では表せない。フラグを書き損ねると
  // 画面に「解約する」が出続ける。
  it("解約予約の有無を行へ書き込む", async () => {
    const supabase = createSupabase([{ data: [{ id: "row-1" }], error: null }]);
    mocks.createClient.mockReturnValue(supabase.client);

    await updateSubscriptionStatusByCustomer({ ...args, cancelAtPeriodEnd: true });

    expect(methodCalls(supabase.queries[0] ?? [], "update")[0]?.[0]).toMatchObject({
      cancel_at_period_end: true,
    });
  });

  // 顧客IDだけで絞ると、同じ顧客の古い購読に対して遅れて届いた deleted が
  // 新しい有効な購読まで取り消してしまう。
  it("顧客IDと購読IDの両方で対象を絞る", async () => {
    const supabase = createSupabase([{ data: [{ id: "row-1" }], error: null }]);
    mocks.createClient.mockReturnValue(supabase.client);

    await updateSubscriptionStatusByCustomer(args);

    expect(methodCalls(supabase.queries[0] ?? [], "eq")).toEqual([
      ["stripe_customer_id", "cus_1"],
      ["stripe_subscription_id", "sub_1"],
      ["provider", "stripe"],
    ]);
  });

  // upsert は相手プロバイダのID列を保持する。IDだけで突合すると、
  // apple へ切り替わった行へ遅延した Stripe イベントが当たり、
  // 有効な権利を上書きする。
  it("provider が stripe の行だけを更新対象にする", async () => {
    const supabase = createSupabase([{ data: [{ id: "row-1" }], error: null }]);
    mocks.createClient.mockReturnValue(supabase.client);

    await updateSubscriptionStatusByCustomer(args);

    expect(methodCalls(supabase.queries[0] ?? [], "eq")).toContainEqual(["provider", "stripe"]);
  });

  // Stripe はイベントの順序を保証しない。Checkout より先に購読イベントが着くと
  // 更新対象がまだ無い。そこで ok を返すと Stripe は再送せず、更新が永久に失われる。
  it("対象の行が無い場合を成功として扱わない", async () => {
    mocks.createClient.mockReturnValue(
      createSupabase([
        { data: [], error: null },
        { data: null, error: null },
      ]).client,
    );

    await expect(updateSubscriptionStatusByCustomer(args)).resolves.toEqual({
      status: "error",
      reason: "subscription_not_found",
    });
  });

  // Stripe は配信順を保証しない。解約済みの行を古い updated が active へ
  // 戻すと、権利が復活したまま残り、失敗として気づけない。
  it("発生時刻が古いイベントで上書きしない", async () => {
    const supabase = createSupabase([{ data: [{ id: "row-1" }], error: null }]);
    mocks.createClient.mockReturnValue(supabase.client);

    await updateSubscriptionStatusByCustomer(args);

    expect(methodCalls(supabase.queries[0] ?? [], "or")[0]?.[0]).toBe(
      `last_event_at.is.null,last_event_at.lt.${args.eventCreatedAt}`,
    );
  });

  // 0行には2つの意味がある。「より新しいイベントで更新済み」を再送させると
  // 永久に失敗し続けるため、行の有無で切り分ける。
  // provider 切替で行が残っている場合もここを通る（ID列は保持されるため
  // probe で見つかる）ので、probe は provider で絞らない。
  it("より新しいイベントが適用済みの場合は再送させない", async () => {
    const supabase = createSupabase([
      { data: [], error: null },
      { data: { id: "row-1" }, error: null },
    ]);
    mocks.createClient.mockReturnValue(supabase.client);

    await expect(updateSubscriptionStatusByCustomer(args)).resolves.toEqual({ status: "ok" });
    expect(methodCalls(supabase.queries[1] ?? [], "eq")).toEqual([
      ["stripe_customer_id", "cus_1"],
      ["stripe_subscription_id", "sub_1"],
    ]);
  });
});

const iapRecord = {
  userId: "00000000-0000-4000-8000-000000000001",
  appleOriginalTransactionId: "otid_1",
  status: "active",
  currentPeriodEnd: "2026-11-01T00:00:00.000Z",
  cancelAtPeriodEnd: false,
  eventCreatedAt: "2026-10-07T12:00:00.000Z",
};

// upsertIapSubscription は3本のクエリを順に投げる:
//   [0] 既存行の確認（provider, last_event_at）
//   [1] TRANSFER 取りこぼし対策の delete
//   [2] upsert 本体
describe("upsertIapSubscription", () => {
  const okResults = [
    { data: null, error: null }, // 既存行なし
    { error: null }, // delete
    { error: null }, // upsert
  ];

  it("apple プロバイダの行として書き込む", async () => {
    const supabase = createSupabase(okResults);
    mocks.createClient.mockReturnValue(supabase.client);

    await expect(upsertIapSubscription(iapRecord)).resolves.toEqual({ status: "ok" });
    const upsertArgs = methodCalls(supabase.queries[2] ?? [], "upsert")[0];
    expect(upsertArgs?.[0]).toMatchObject({
      user_id: iapRecord.userId,
      provider: "apple",
      apple_original_transaction_id: "otid_1",
    });
    expect(upsertArgs?.[1]).toEqual({ onConflict: "user_id" });
  });

  // provider を書き忘れると default の 'stripe' のまま残り、
  // Apple の購読が Stripe 購読として見えてしまう。
  it("provider を省略して書かない", async () => {
    const supabase = createSupabase(okResults);
    mocks.createClient.mockReturnValue(supabase.client);

    await upsertIapSubscription(iapRecord);

    const written = methodCalls(supabase.queries[2] ?? [], "upsert")[0]?.[0];
    expect(written).toMatchObject({ provider: "apple" });
  });

  // プロバイダ切替で相手側のID列を消すと、Stripe 側に生きた購読が残る
  // 利用者のポータル・解約導線が切れる。列は保持し、誤突合は update 側の
  // provider 条件で防ぐ。
  it("相手プロバイダのID列を書き換えない", async () => {
    const supabase = createSupabase(okResults);
    mocks.createClient.mockReturnValue(supabase.client);

    await upsertIapSubscription(iapRecord);

    const payload = methodCalls(supabase.queries[2] ?? [], "upsert")[0]?.[0];
    expect(payload).not.toHaveProperty("stripe_customer_id");
    expect(payload).not.toHaveProperty("stripe_subscription_id");
  });

  // 順序制御の基点。これを書かないと、後から届く古い遷移イベントが
  // 新しい購入を上書きする。
  it("イベントの発生時刻を行へ書き込む", async () => {
    const supabase = createSupabase(okResults);
    mocks.createClient.mockReturnValue(supabase.client);

    await upsertIapSubscription(iapRecord);

    expect(methodCalls(supabase.queries[2] ?? [], "upsert")[0]?.[0]).toMatchObject({
      last_event_at: iapRecord.eventCreatedAt,
    });
  });

  // TRANSFER の取りこぼしで、別ユーザーの行が同じ transaction id を持ったまま
  // 残っていると upsert が unique 制約に衝突して永久に再送される。
  // 先に消してから書く。
  it("同じ transaction id を持つ別ユーザーの apple 行を先に消す", async () => {
    const supabase = createSupabase(okResults);
    mocks.createClient.mockReturnValue(supabase.client);

    await upsertIapSubscription(iapRecord);

    const deleteCalls = methodCalls(supabase.queries[1] ?? [], "delete");
    expect(deleteCalls).toHaveLength(1);
    expect(methodCalls(supabase.queries[1] ?? [], "eq")).toEqual([
      ["provider", "apple"],
      ["apple_original_transaction_id", "otid_1"],
    ]);
    expect(methodCalls(supabase.queries[1] ?? [], "neq")).toEqual([
      ["user_id", iapRecord.userId],
    ]);
  });

  // 順序制御: EXPIRATION / REFUND 適用済みの apple 行へ遅延した
  // RENEWAL 等が届くと権利が復活してしまう。同等以上に新しいイベントが
  // 適用済みなら書かずに成功扱いで終える（再送は無意味）。
  it.each([
    ["新しい", "2026-10-08T00:00:00+00:00"],
    ["同じ", "2026-10-07T12:00:00.000Z"], // 表記が違っても同一時刻なら弾く
  ])("既存の apple 行に%sイベントが適用済みなら書かない", async (_label, lastEventAt) => {
    const supabase = createSupabase([
      { data: { provider: "apple", last_event_at: lastEventAt }, error: null },
    ]);
    mocks.createClient.mockReturnValue(supabase.client);

    await expect(upsertIapSubscription(iapRecord)).resolves.toEqual({ status: "ok" });
    // lookup で終わり、delete も upsert も走らない。
    expect(supabase.client.from).toHaveBeenCalledTimes(1);
  });

  // 陽性側: 既存行より新しいイベントは適用する。
  it("既存の apple 行より新しいイベントは適用する", async () => {
    const supabase = createSupabase([
      { data: { provider: "apple", last_event_at: "2026-10-06T00:00:00+00:00" }, error: null },
      { error: null },
      { error: null },
    ]);
    mocks.createClient.mockReturnValue(supabase.client);

    await expect(upsertIapSubscription(iapRecord)).resolves.toEqual({ status: "ok" });
    expect(methodCalls(supabase.queries[2] ?? [], "upsert")).toHaveLength(1);
  });

  // stripe からの切替は正当な適用。last_event_at が新しくても上書きする。
  it("既存行が stripe ならプロバイダ切替として適用する", async () => {
    const supabase = createSupabase([
      { data: { provider: "stripe", last_event_at: "2026-10-08T00:00:00+00:00" }, error: null },
      { error: null },
      { error: null },
    ]);
    mocks.createClient.mockReturnValue(supabase.client);

    await expect(upsertIapSubscription(iapRecord)).resolves.toEqual({ status: "ok" });
    expect(methodCalls(supabase.queries[2] ?? [], "upsert")).toHaveLength(1);
  });

  // last_event_at が無い古い行は順序を比較できないため、常に適用する。
  it("既存の apple 行に last_event_at が無ければ適用する", async () => {
    const supabase = createSupabase([
      { data: { provider: "apple", last_event_at: null }, error: null },
      { error: null },
      { error: null },
    ]);
    mocks.createClient.mockReturnValue(supabase.client);

    await expect(upsertIapSubscription(iapRecord)).resolves.toEqual({ status: "ok" });
    expect(methodCalls(supabase.queries[2] ?? [], "upsert")).toHaveLength(1);
  });

  it("既存行の確認に失敗したら書き込みに進まない", async () => {
    const supabase = createSupabase([{ data: null, error: { code: "XX001" } }]);
    mocks.createClient.mockReturnValue(supabase.client);

    await expect(upsertIapSubscription(iapRecord)).resolves.toMatchObject({ status: "error" });
    expect(supabase.client.from).toHaveBeenCalledTimes(1);
  });

  it("移転元の行の削除に失敗したら書き込みに進まない", async () => {
    const supabase = createSupabase([
      { data: null, error: null },
      { error: { code: "XX001" } },
    ]);
    mocks.createClient.mockReturnValue(supabase.client);

    await expect(upsertIapSubscription(iapRecord)).resolves.toMatchObject({ status: "error" });
    expect(supabase.client.from).toHaveBeenCalledTimes(2);
  });

  it("書き込みの失敗を成功として扱わない", async () => {
    mocks.createClient.mockReturnValue(
      createSupabase([
        { data: null, error: null },
        { error: null },
        { error: { code: "23505" } },
      ]).client,
    );

    await expect(upsertIapSubscription(iapRecord)).resolves.toMatchObject({ status: "error" });
  });
});

describe("updateIapSubscriptionByTransaction", () => {
  const args = {
    appleOriginalTransactionId: "otid_1",
    status: "expired",
    currentPeriodEnd: "2026-10-01T00:00:00.000Z",
    cancelAtPeriodEnd: false,
    eventCreatedAt: "2026-10-07T12:00:00.000Z",
  };

  // 突合キーを間違えると他人の購読まで書き換える。
  it("original_transaction_id で対象を絞って更新する", async () => {
    const supabase = createSupabase([{ data: [{ id: "row-1" }], error: null }]);
    mocks.createClient.mockReturnValue(supabase.client);

    await expect(updateIapSubscriptionByTransaction(args)).resolves.toEqual({ status: "ok" });
    expect(methodCalls(supabase.queries[0] ?? [], "eq")).toContainEqual([
      "apple_original_transaction_id",
      "otid_1",
    ]);
  });

  // upsert は相手プロバイダのID列を保持する。IDだけで突合すると、
  // stripe へ切り替わった行へ遅延した Apple イベントが当たり、
  // 有効な権利を上書きする。
  it("provider が apple の行だけを更新対象にする", async () => {
    const supabase = createSupabase([{ data: [{ id: "row-1" }], error: null }]);
    mocks.createClient.mockReturnValue(supabase.client);

    await updateIapSubscriptionByTransaction(args);

    expect(methodCalls(supabase.queries[0] ?? [], "eq")).toContainEqual(["provider", "apple"]);
  });

  it("発生時刻が古いイベントで上書きしない", async () => {
    const supabase = createSupabase([{ data: [{ id: "row-1" }], error: null }]);
    mocks.createClient.mockReturnValue(supabase.client);

    await updateIapSubscriptionByTransaction(args);

    expect(methodCalls(supabase.queries[0] ?? [], "or")[0]?.[0]).toBe(
      `last_event_at.is.null,last_event_at.lt.${args.eventCreatedAt}`,
    );
  });

  // RevenueCat も配信順を保証しない。INITIAL_PURCHASE より先に遷移イベントが
  // 着くと対象が無い。ok を返すと再送されず更新が永久に失われる。
  it("対象の行が無い場合を成功として扱わない", async () => {
    mocks.createClient.mockReturnValue(
      createSupabase([
        { data: [], error: null },
        { data: null, error: null },
      ]).client,
    );

    await expect(updateIapSubscriptionByTransaction(args)).resolves.toEqual({
      status: "error",
      reason: "subscription_not_found",
    });
  });

  // provider 切替で行が残っている場合もここを通る（ID列は保持されるため
  // probe で見つかる）ので、probe は provider で絞らない。
  it("より新しいイベントが適用済みの場合は再送させない", async () => {
    const supabase = createSupabase([
      { data: [], error: null },
      { data: { id: "row-1" }, error: null },
    ]);
    mocks.createClient.mockReturnValue(supabase.client);

    await expect(updateIapSubscriptionByTransaction(args)).resolves.toEqual({ status: "ok" });
    expect(methodCalls(supabase.queries[1] ?? [], "eq")).toEqual([
      ["apple_original_transaction_id", "otid_1"],
    ]);
  });
});

describe("deleteTransferredIapSubscription", () => {
  const fromUserId = "00000000-0000-4000-8000-000000000099";

  // TRANSFER 後に移転元の行が残ると、旧ユーザーに権利が残り続け、
  // 新しい持ち主の upsert が unique 制約に衝突して永久に再送される。
  it("移転元ユーザーの該当 apple 行を消す", async () => {
    const supabase = createSupabase([{ error: null }]);
    mocks.createClient.mockReturnValue(supabase.client);

    await expect(
      deleteTransferredIapSubscription({
        appleOriginalTransactionId: "otid_1",
        fromUserIds: [fromUserId],
      }),
    ).resolves.toEqual({ status: "ok" });

    expect(methodCalls(supabase.queries[0] ?? [], "delete")).toHaveLength(1);
    expect(methodCalls(supabase.queries[0] ?? [], "eq")).toEqual([
      ["provider", "apple"],
      ["apple_original_transaction_id", "otid_1"],
    ]);
    expect(methodCalls(supabase.queries[0] ?? [], "in")).toEqual([
      ["user_id", [fromUserId]],
    ]);
  });

  // 移転元が特定できない場合、消せる行は無い。空配列を .in() に渡すと
  // 不正なクエリになるため、クエリを発行せず成功で終える。
  it("移転元が無ければクエリを発行せず成功で終える", async () => {
    const supabase = createSupabase();
    mocks.createClient.mockReturnValue(supabase.client);

    await expect(
      deleteTransferredIapSubscription({
        appleOriginalTransactionId: "otid_1",
        fromUserIds: [],
      }),
    ).resolves.toEqual({ status: "ok" });
    expect(supabase.client.from).not.toHaveBeenCalled();
  });

  it("削除の失敗を成功として扱わない", async () => {
    mocks.createClient.mockReturnValue(
      createSupabase([{ error: { code: "XX001" } }]).client,
    );

    await expect(
      deleteTransferredIapSubscription({
        appleOriginalTransactionId: "otid_1",
        fromUserIds: [fromUserId],
      }),
    ).resolves.toMatchObject({ status: "error" });
  });
});
