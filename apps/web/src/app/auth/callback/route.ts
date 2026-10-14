import { NextResponse, type NextRequest } from "next/server";

import { buildNextUrl, exchangeAuthCode, sanitizeNextPath } from "@/lib/supabase/auth-callback";

function redirectBack(
  next: string,
  origin: string,
  key: "auth_error" | "auth_linked",
  value: string,
) {
  return NextResponse.redirect(buildNextUrl(next, origin, { key, value }));
}

/**
 * Google の OAuth から戻る先。`linkIdentity()` / `signInWithOAuth()` の
 * どちらもここへ戻り、`code` をセッションへ交換してから元の画面へ返す。
 *
 * 失敗は握り潰さず、理由を `?error=` に載せて画面側で提示する。
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = sanitizeNextPath(searchParams.get("next"));

  // Supabase 側で拒否された場合は code ではなくエラーが載って戻る。
  const providerError = searchParams.get("error_code") ?? searchParams.get("error");
  if (providerError) {
    return redirectBack(next, origin, "auth_error", providerError);
  }

  const code = searchParams.get("code");
  if (!code) {
    return redirectBack(next, origin, "auth_error", "missing_code");
  }

  const result = await exchangeAuthCode(code);

  if (result.status === "error") {
    return redirectBack(next, origin, "auth_error", result.reason);
  }

  return redirectBack(next, origin, "auth_linked", "1");
}
