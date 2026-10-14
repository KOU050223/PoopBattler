import { createClient } from "./server";

// OAuth（PKCE）から戻ってきた `code` をセッションへ交換する。
// Route Handler はデータアクセス境界の許可リストに入っていないため、
// クライアントの生成はここへ閉じ込め、Route Handler には結果だけを返す。

export type AuthCallbackResult =
  | { status: "ok" }
  | { status: "error"; reason: string };

/** 戻り先の解決に使う基準オリジン。値は何でもよく、比較にしか使わない。 */
const SAME_ORIGIN_BASE = "http://localhost";

/**
 * リダイレクト先のオープンリダイレクトを防ぐ。`next` は同一オリジンの
 * 絶対パスだけを許可し、それ以外は入口へ戻す。
 *
 * 「`//` で始まる」のような書式の禁止リストにはしない。WHATWG の URL パーサは
 * 特別スキームでバックスラッシュをスラッシュへ正規化するため、`/\evil.example`
 * が `//evil.example` と同じ意味になり、書式だけを見る検査をすり抜ける。
 * 実際に解決して origin が変わらないことを確かめる方が、表記の揺れに強い。
 */
export function sanitizeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/")) return "/";

  let resolved: URL;
  try {
    resolved = new URL(next, SAME_ORIGIN_BASE);
  } catch {
    return "/";
  }

  if (resolved.origin !== SAME_ORIGIN_BASE) return "/";

  // 解決後の値を返す。入力のまま返すと、パーサが正規化する表記
  // （バックスラッシュなど）が下流へそのまま渡ってしまう。
  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}

export async function exchangeAuthCode(code: string): Promise<AuthCallbackResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return { status: "error", reason: error.code ?? "exchange_failed" };
  }

  return { status: "ok" };
}

/**
 * 戻り先へコールバックの結果を載せる。`next` は既にクエリやフラグメントを
 * 持ちうるため、文字列連結ではなく `searchParams` を通す。連結すると
 * `/meals?tab=today` が `/meals?tab=today?auth_error=...` になり、
 * 受け取り側がパラメータとして読めない。
 */
export function buildNextUrl(
  next: string,
  origin: string,
  flag: { key: "auth_error" | "auth_linked"; value: string },
): URL {
  const url = new URL(sanitizeNextPath(next), origin);
  url.searchParams.set(flag.key, flag.value);

  return url;
}
