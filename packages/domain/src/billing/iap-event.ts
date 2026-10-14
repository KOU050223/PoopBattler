export type IapSubscriptionRecord = {
  userId: string;
  /** App Store 購読の安定ID（Stripe の subscription id 相当）。 */
  appleOriginalTransactionId: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  /** このイベントの発生時刻。順序制御のため行へも書き込む。 */
  eventCreatedAt: string;
};

/**
 * RevenueCat の webhook が送る event オブジェクトの最小構造型。
 * body は `{ api_version, event: {...} }` で、ここでは event 側だけを見る。
 */
export type IapEventLike = {
  type?: string;
  app_user_id?: string;
  original_transaction_id?: string;
  expiration_at_ms?: number | null;
  event_timestamp_ms?: number;
  /** SANDBOX / PRODUCTION。サンドボックスも弾かず受ける。 */
  environment?: string;
  /** TRANSFER で送られる、権利の移転元となった app_user_id の配列。 */
  transferred_from?: string[];
  /** TRANSFER で送られる、権利の移転先の app_user_id の配列。 */
  transferred_to?: string[];
};

/**
 * RevenueCat のイベントから、subscriptions へ書き込む内容を組み立てる。
 *
 * resolveStripeEvent と同じく Route Handler から切り離した純粋関数。
 * 購読の状態遷移はここに集約し、「通ったのに間違った行を書いた」を
 * テストで固定できる形にしておく。
 */

export type IapEventOutcome =
  | { kind: "upsert"; record: IapSubscriptionRecord }
  | {
      kind: "transfer";
      appleOriginalTransactionId: string;
      /** 権利の移転元。uuid として解釈できた app_user_id だけを残す。 */
      fromUserIds: string[];
    }
  | {
      kind: "update-by-transaction";
      appleOriginalTransactionId: string;
      status: string;
      currentPeriodEnd: string | null;
      cancelAtPeriodEnd: boolean;
      /** このイベントの発生時刻。これより新しい行は上書きしない。 */
      eventCreatedAt: string;
    }
  /** 購読の権利に関係しないイベント。200 を返して受け取りだけ済ませる。 */
  | { kind: "ignore" }
  /** 処理対象のイベントだが必要な情報が欠けている。設定ミスとして扱う。 */
  | { kind: "invalid"; reason: string };

/**
 * 権利を有効（active）として書き直すイベント。
 * このアプリは定期購読のみ販売する。NON_RENEWING_PURCHASE（消耗型・
 * 買い切り型の購入）を含めると購読行が関係ないイベントで上書きされるため
 * 受け付けない。
 */
const UPSERT_EVENT_TYPES = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "PRODUCT_CHANGE",
]);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toIsoOrNull(ms: number | null | undefined): string | null {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

export function resolveIapEvent(event: IapEventLike | undefined): IapEventOutcome {
  const type = event?.type;

  // TRANSFER は権利が別ユーザーへ移った通知。新しい持ち主側は別途届く
  // 購入系イベント（upsert）が処理するため、ここでは移転元の行を消すだけ。
  // upsert/update の判定より先に扱う。app_user_id は移転元を表さない
  // ことがあるため、この分岐では見ない。
  if (type === "TRANSFER") {
    const transactionId = event?.original_transaction_id;
    if (!transactionId) {
      return { kind: "invalid", reason: "event_missing_original_transaction_id" };
    }
    // app_user_id には auth.users.id が入る前提。匿名IDなど uuid でない値は
    // こちらの行と結び付かないため、消す対象を特定できる分だけ残す。
    const fromUserIds = Array.isArray(event?.transferred_from)
      ? event.transferred_from.filter(
          (id): id is string => typeof id === "string" && UUID_PATTERN.test(id),
        )
      : [];
    // 移転元が特定できない TRANSFER は消せる行が無い。再送させても
    // 同じ payload で失敗し続けるだけなので受領する。
    if (fromUserIds.length === 0) {
      return { kind: "ignore" };
    }
    return {
      kind: "transfer",
      appleOriginalTransactionId: transactionId,
      fromUserIds,
    };
  }

  const isUpsert = typeof type === "string" && UPSERT_EVENT_TYPES.has(type);
  const isUpdate =
    type === "CANCELLATION"
    || type === "EXPIRATION"
    || type === "BILLING_ISSUE"
    || type === "REFUND";

  // TEST や SUBSCRIPTION_PAUSED など、権利に関係しないイベントは受け取りだけ済ませる。
  if (!isUpsert && !isUpdate) {
    return { kind: "ignore" };
  }

  // 利用者の対応付けは auth.users.id を app_user_id に入れる前提（native 側が設定）。
  // ID が無い・形式が違うイベントは誰の権利か決められない。
  const userId = event?.app_user_id;
  if (!userId || !UUID_PATTERN.test(userId)) {
    return { kind: "invalid", reason: "event_missing_app_user_id" };
  }

  // 購読の安定ID。以降の状態遷移はこれで既存行を突合する。
  const transactionId = event?.original_transaction_id;
  if (!transactionId) {
    return { kind: "invalid", reason: "event_missing_original_transaction_id" };
  }

  // RevenueCat は配信順を保証しないため、到着順ではなく発生順を正とする。
  // 発生時刻が取れないと順序制御が効かず、古いイベントで新しい状態を
  // 上書きしうるため処理しない。
  const timestampMs = event?.event_timestamp_ms;
  if (typeof timestampMs !== "number" || !Number.isFinite(timestampMs)) {
    return { kind: "invalid", reason: "event_missing_event_timestamp_ms" };
  }
  const eventCreatedAt = new Date(timestampMs).toISOString();

  const currentPeriodEnd = toIsoOrNull(event?.expiration_at_ms);

  if (isUpsert) {
    return {
      kind: "upsert",
      record: {
        userId,
        appleOriginalTransactionId: transactionId,
        status: "active",
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
        eventCreatedAt,
      },
    };
  }

  // CANCELLATION は自動更新OFFの通知であり権利は期限まで残る。
  // EXPIRATION で初めて権利を失う。BILLING_ISSUE は課金失敗、
  // REFUND は返金による権利剥奪。
  const status =
    type === "CANCELLATION"
      ? "active"
      : type === "BILLING_ISSUE"
        ? "billing_issue"
        : type === "REFUND"
          ? "refunded"
          : "expired";

  return {
    kind: "update-by-transaction",
    appleOriginalTransactionId: transactionId,
    status,
    currentPeriodEnd,
    cancelAtPeriodEnd: type === "CANCELLATION",
    eventCreatedAt,
  };
}
