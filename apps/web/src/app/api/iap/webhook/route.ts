import { createHash, timingSafeEqual } from "node:crypto";

import { getIapWebhookSecret } from "@/features/billing/iap-env";
import { resolveIapEvent, type IapEventLike } from "@poopbattler/domain/billing/iap-event";
import {
  deleteTransferredIapSubscription,
  updateIapSubscriptionByTransaction,
  upsertIapSubscription,
} from "@/lib/supabase/subscription-write";

// RevenueCat の Webhook 受け口（Apple IAP の権利付与）。
//
// この Route Handler はデータアクセス境界の許可リストに入っていないため、
// Supabase クライアントは生成しない。書き込みは lib/supabase/subscription-write.ts
// が閉じて持ち、ここは「共有シークレット検証 → イベントの解釈 → 書き込みの呼び出し」
// だけを行う（api/stripe/webhook/route.ts と同じ形）。

/**
 * Authorization ヘッダの値を共有シークレットと照合する。
 *
 * RCダッシュボードで設定した文字列がそのまま来る。長さが違うと
 * timingSafeEqual が例外を投げるため、両辺を SHA-256 で潰してから比較する
 * （ダイジェストの長さは常に等しい）。
 */
function authorizationMatches(presented: string, secret: string): boolean {
  const a = createHash("sha256").update(presented).digest();
  const b = createHash("sha256").update(secret).digest();
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  let secret: string;
  try {
    secret = getIapWebhookSecret();
  } catch {
    // 設定漏れを 400 で返すと RevenueCat が再送しない。500 にして再送させる。
    return new Response("IAP webhook is not configured", { status: 500 });
  }

  // 共有シークレットが一致しない要求は、こちらの不具合ではないので再送させない。
  const authorization = request.headers.get("authorization");
  if (!authorization || !authorizationMatches(authorization, secret)) {
    return new Response("Invalid authorization", { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const outcome = resolveIapEvent((payload as { event?: IapEventLike })?.event);

  if (outcome.kind === "ignore") {
    return new Response("Ignored", { status: 200 });
  }

  if (outcome.kind === "invalid") {
    // 購読のイベントなのに必要な ID が無い。こちらの設定ミスなので、
    // 200 で握り潰さず失敗として残す。
    return new Response(`Unprocessable event: ${outcome.reason}`, { status: 422 });
  }

  const result = outcome.kind === "upsert"
    ? await upsertIapSubscription(outcome.record)
    : outcome.kind === "transfer"
      // 権利の移転元の行を消す。新しい持ち主側は別途届く upsert 系が処理する。
      ? await deleteTransferredIapSubscription({
          appleOriginalTransactionId: outcome.appleOriginalTransactionId,
          fromUserIds: outcome.fromUserIds,
        })
      : await updateIapSubscriptionByTransaction({
        appleOriginalTransactionId: outcome.appleOriginalTransactionId,
        status: outcome.status,
        currentPeriodEnd: outcome.currentPeriodEnd,
        cancelAtPeriodEnd: outcome.cancelAtPeriodEnd,
        eventCreatedAt: outcome.eventCreatedAt,
      });

  if (result.status === "error") {
    // アカウント削除済みユーザーの購読イベントは、auth.users 削除の cascade で
    // subscriptions に行を置けず FK 違反（23503）になる。
    // Stripe と違い、こちらから Apple の購読をサーバー側で解約する手段は無い
    // （解約は App Store 側でユーザーが行う）。書けない行を再送させても
    // 永久に失敗するだけなので、200 で受領して終わる。
    if (result.reason === "23503") {
      return new Response("User deleted; event acknowledged", { status: 200 });
    }

    // 書き込みに失敗したまま 200 を返すと、権利が付かないのに
    // RevenueCat 側は成功扱いで再送しない。500 で再送させる。
    return new Response(`Failed to persist subscription: ${result.reason}`, { status: 500 });
  }

  return new Response("Success", { status: 200 });
}
