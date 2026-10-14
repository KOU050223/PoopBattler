/**
 * RevenueCat webhook の共有シークレット。
 * RCダッシュボードで設定した値が `Authorization` ヘッダにそのまま来るため、
 * 値を照合して検証する。`NEXT_PUBLIC_` を付けない名前で `.env.local` にのみ置く。
 *
 * 未設定なら throw する（stripe-env.ts と同じ作法）。
 */
export function getIapWebhookSecret() {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("RevenueCat の Webhook 共有シークレットが設定されていません。");
  }

  return secret;
}
