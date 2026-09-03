import { createClient } from "./server";

// OAuth（PKCE）から戻ってきた `code` をセッションへ交換する。
// Route Handler はデータアクセス境界の許可リストに入っていないため、
// クライアントの生成はここへ閉じ込め、Route Handler には結果だけを返す。

export type AuthCallbackResult =
  | { status: "ok" }
  | { status: "error"; reason: string };

/**
 * リダイレクト先のオープンリダイレクトを防ぐ。`next` は同一オリジンの
 * 絶対パスだけを許可し、それ以外は入口へ戻す。
 */
export function sanitizeNextPath(next: string | null): string {
  if (!next) return "/";
  // "//evil.example" は URL としては別オリジンを指すため弾く。
  if (!next.startsWith("/") || next.startsWith("//")) return "/";

  return next;
}

export async function exchangeAuthCode(code: string): Promise<AuthCallbackResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return { status: "error", reason: error.code ?? "exchange_failed" };
  }

  return { status: "ok" };
}
