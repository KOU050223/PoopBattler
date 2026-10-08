import { toAccountStatus, type AccountStatus } from "@poopbattler/domain/account/account.types";

// apps/web/src/lib/supabase/google-identity.ts の RN 版。
// web はブラウザ遷移で完結するが、RN では supabase-js が返す provider URL を
// アプリ内ブラウザ（expo-web-browser の openAuthSessionAsync）で開き、
// poopbattler:// スキームへのリダイレクトを受け取ってセッションを張る。
//
// auth-js の既定 flowType は implicit のため、リダイレクトURLの fragment に
// access_token / refresh_token が載る（linkIdentity / signInWithOAuth 共通）。

type AuthError = { message: string; code?: string };

type UserLike = {
  is_anonymous?: boolean;
  email?: string | null;
  identities?: { provider: string }[] | null;
};

export type GoogleOAuthAuth = {
  linkIdentity: (credentials: {
    provider: "google";
    options?: { redirectTo?: string; skipBrowserRedirect?: boolean };
  }) => Promise<{ data: { url?: string | null } | null; error: AuthError | null }>;
  signInWithOAuth: (credentials: {
    provider: "google";
    options?: { redirectTo?: string; skipBrowserRedirect?: boolean };
  }) => Promise<{ data: { url?: string | null } | null; error: AuthError | null }>;
  setSession: (tokens: { access_token: string; refresh_token: string }) => Promise<{ error: AuthError | null }>;
  getUser: () => Promise<{ data: { user: UserLike | null }; error: AuthError | null }>;
};

/** WebBrowser.openAuthSessionAsync と同じ呼び出し形（result.type === "success" で url が返る）。 */
export type OpenAuthSession = (
  url: string,
  redirectUrl: string,
) => Promise<{ type: string; url?: string }>;

export type GoogleAuthFailureReason =
  /** その Google アカウントは別ユーザーに紐付いている。 */
  | "identity_already_exists"
  /** サーバー側で manual linking / Google provider が無効。 */
  | "manual_linking_disabled"
  | "validation_failed"
  /** Supabase が認可URLを返さなかった。 */
  | "no-url"
  /** リダイレクトURLにトークンもエラーも無かった。 */
  | "unexpected-redirect"
  | "unknown";

export type GoogleAuthOutcome =
  | { status: "ok"; account: AccountStatus }
  /** ユーザーがブラウザを閉じた。再試行案内は出さない。 */
  | { status: "cancelled" }
  | { status: "error"; reason: GoogleAuthFailureReason };

/** リダイレクトURLの query / fragment 両方から auth 関連パラメータを拾う。 */
export function parseAuthRedirectUrl(url: string): {
  accessToken?: string;
  refreshToken?: string;
  errorCode?: string;
} {
  const [beforeFragment, fragment = ""] = url.split("#", 2);
  const query = beforeFragment.includes("?") ? beforeFragment.slice(beforeFragment.indexOf("?") + 1) : "";
  const params = new URLSearchParams(`${query}&${fragment}`);

  const errorCode =
    params.get("error_code") ?? params.get("error") ?? undefined;

  return {
    accessToken: params.get("access_token") ?? undefined,
    refreshToken: params.get("refresh_token") ?? undefined,
    errorCode,
  };
}

function mapAuthError(error: AuthError | null): GoogleAuthOutcome {
  if (!error) return { status: "error", reason: "unknown" };
  if (error.code === "identity_already_exists") {
    return { status: "error", reason: "identity_already_exists" };
  }
  if (error.code === "manual_linking_disabled" || error.code === "validation_failed") {
    return { status: "error", reason: error.code };
  }
  return { status: "error", reason: "unknown" };
}

/**
 * Google の OAuth フローを実行する。
 *
 * mode="link" は匿名ユーザーへ identity を追加（auth.users.id は変わらない）、
 * mode="sign-in" は既存の Google 連携アカウントへログインし直す
 * （その端末の匿名アカウントは離れる）。
 *
 * openAuthSessionAsync は callbackUrlScheme に合うリダイレクトを捕まえて
 * resolve するため、リダイレクト先のルート画面は要らない
 * （Android で deep link が router にも届きうるため保険の画面は別途置く）。
 */
export async function runGoogleOAuthFlow(
  auth: GoogleOAuthAuth,
  openSession: OpenAuthSession,
  redirectTo: string,
  mode: "link" | "sign-in",
): Promise<GoogleAuthOutcome> {
  const credentials = {
    provider: "google" as const,
    options: { redirectTo, skipBrowserRedirect: true },
  };
  const { data, error } = mode === "link"
    ? await auth.linkIdentity(credentials)
    : await auth.signInWithOAuth(credentials);

  if (error) return mapAuthError(error);
  const url = data?.url;
  if (!url) return { status: "error", reason: "no-url" };

  const result = await openSession(url, redirectTo);
  if (result.type !== "success" || !result.url) return { status: "cancelled" };

  const parsed = parseAuthRedirectUrl(result.url);
  if (parsed.errorCode) {
    return mapAuthError({ message: parsed.errorCode, code: parsed.errorCode });
  }

  if (parsed.accessToken && parsed.refreshToken) {
    const { error: sessionError } = await auth.setSession({
      access_token: parsed.accessToken,
      refresh_token: parsed.refreshToken,
    });
    if (sessionError) return { status: "error", reason: "unknown" };
  } else {
    // link の成功時も fragment にセッションが載る前提。無い場合は
    // 「成功したか分からない」で握り潰さずエラーとして扱う。
    return { status: "error", reason: "unexpected-redirect" };
  }

  const { data: userData, error: userError } = await auth.getUser();
  if (userError || !userData.user) return { status: "error", reason: "unknown" };
  return { status: "ok", account: toAccountStatus(userData.user) };
}
