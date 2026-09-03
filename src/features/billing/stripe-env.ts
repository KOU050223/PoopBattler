/**
 * Stripe の接続情報。`NEXT_PUBLIC_` を付けない名前で `.env.local` にのみ置く。
 *
 * 未設定なら throw する（lib/supabase/env.ts と同じ作法）。
 * 既定値へ落とすと、鍵が無いまま決済ページを作りにいって
 * 分かりにくいエラーになる。
 */
export function getStripeEnvironment() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!secretKey || !priceId || !appUrl) {
    throw new Error("Stripe の接続情報が設定されていません。");
  }

  return { secretKey, priceId, appUrl };
}

/** Webhook の署名検証に使う秘密。用途が違うので別関数にする。 */
export function getStripeWebhookSecret() {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("Stripe の Webhook 署名シークレットが設定されていません。");
  }

  return webhookSecret;
}
