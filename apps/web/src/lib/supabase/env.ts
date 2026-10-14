export function getSupabaseEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error("Supabase の公開接続情報が設定されていません。");
  }

  return { url, publishableKey };
}

/**
 * RLS をバイパスするサービスロールの接続情報。
 *
 * `getSupabaseEnvironment()` を拡張して秘密鍵も返せるようにはしない。
 * 公開キーを取りに来た経路が秘密鍵を返せる形になっていると、
 * ブラウザへ渡るコードから呼ばれても型では気づけない。
 */
export function getServiceRoleEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase のサービスロール接続情報が設定されていません。");
  }

  return { url, serviceRoleKey };
}
