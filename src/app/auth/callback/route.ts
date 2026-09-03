import { NextResponse, type NextRequest } from "next/server";

import { exchangeAuthCode, sanitizeNextPath } from "@/lib/supabase/auth-callback";

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
    return NextResponse.redirect(
      new URL(`${next}?auth_error=${encodeURIComponent(providerError)}`, origin),
    );
  }

  const code = searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL(`${next}?auth_error=missing_code`, origin));
  }

  const result = await exchangeAuthCode(code);

  if (result.status === "error") {
    return NextResponse.redirect(
      new URL(`${next}?auth_error=${encodeURIComponent(result.reason)}`, origin),
    );
  }

  return NextResponse.redirect(new URL(`${next}?auth_linked=1`, origin));
}
