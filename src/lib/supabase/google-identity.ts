import { createClient } from "./client";

// 匿名ユーザーを Google アカウントへ昇格させる経路と、
// 既に Google アカウントを持つユーザーが別端末でログインし直す経路をまとめる。
//
// docs/architecture.md「責務のルール」3 のとおり、認証もデータアクセス境界の
// 例外にしない。Supabaseクライアントの生成はこのモジュールの内側へ閉じ込め、
// UIには結果だけを返す（anonymous-session.ts と同じ形）。

type AuthError = {
  message: string;
  code?: string;
  status?: number;
};

/** ブラウザ側で必要な auth API だけを写し取った最小のインターフェース。 */
export type GoogleIdentityAuth = {
  linkIdentity: (credentials: {
    provider: "google";
    options?: { redirectTo?: string };
  }) => Promise<{ data: unknown; error: AuthError | null }>;
  signInWithOAuth: (credentials: {
    provider: "google";
    options?: { redirectTo?: string };
  }) => Promise<{ data: unknown; error: AuthError | null }>;
};

export type GoogleIdentityResult =
  | { status: "redirecting" }
  | { status: "conflict"; message: string }
  | { status: "error"; message: string };

/**
 * `linkIdentity()` が返す衝突エラー。既にそのGoogleアカウントが
 * （自分自身か別ユーザーに）紐づいている場合に返る。
 * MVPではデータのマージを行わないため、画面で明示的に扱う。
 */
const IDENTITY_ALREADY_EXISTS = "identity_already_exists";

const CONFLICT_MESSAGE =
  "このGoogleアカウントは既に別のアカウントで使われています。データの統合は行えないため、"
  + "そのアカウントでログインし直すか、別のGoogleアカウントを選んでください。";

/**
 * 連携を無効化したままのプロジェクトで linkIdentity() を呼ぶと返るコード。
 * 設定漏れをネットワークエラーと取り違えないよう、専用の文言にする。
 */
const MANUAL_LINKING_DISABLED = "manual_linking_disabled";

const MANUAL_LINKING_DISABLED_MESSAGE =
  "アカウント連携がサーバー側で有効になっていません。設定を確認してください。";

function toResult(error: AuthError | null): GoogleIdentityResult {
  if (!error) {
    // linkIdentity / signInWithOAuth はブラウザでは Google へ遷移する。
    // 呼び出し元へ制御が戻ってもページはこれから離れるため、成功ではなく
    // 「遷移中」として返す。完了の判定はコールバック側が行う。
    return { status: "redirecting" };
  }

  if (error.code === IDENTITY_ALREADY_EXISTS) {
    return { status: "conflict", message: CONFLICT_MESSAGE };
  }

  if (error.code === MANUAL_LINKING_DISABLED) {
    return { status: "error", message: MANUAL_LINKING_DISABLED_MESSAGE };
  }

  return { status: "error", message: error.message };
}

/** 匿名ユーザーに Google の identity を追加する（`auth.users.id` は変わらない）。 */
export async function linkGoogleIdentity(
  auth: GoogleIdentityAuth,
  redirectTo: string,
): Promise<GoogleIdentityResult> {
  const { error } = await auth.linkIdentity({
    provider: "google",
    options: { redirectTo },
  });

  return toResult(error);
}

/**
 * 既に Google と連携済みのアカウントへログインし直す。
 * 新しい端末では匿名ユーザーが先に作られているため、この経路は
 * 「その端末の匿名データを捨てて既存アカウントへ戻る」意味になる。
 */
export async function signInWithGoogle(
  auth: GoogleIdentityAuth,
  redirectTo: string,
): Promise<GoogleIdentityResult> {
  const { error } = await auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

  return toResult(error);
}

/** OAuth から戻る先。config.toml の additional_redirect_urls と完全一致させる。 */
export function buildCallbackUrl(origin: string, next: string): string {
  const url = new URL("/auth/callback", origin);
  url.searchParams.set("next", next);

  return url.toString();
}

export async function linkGoogleIdentityFromBrowser(
  next: string,
): Promise<GoogleIdentityResult> {
  return linkGoogleIdentity(
    createClient().auth,
    buildCallbackUrl(window.location.origin, next),
  );
}

export async function signInWithGoogleFromBrowser(
  next: string,
): Promise<GoogleIdentityResult> {
  return signInWithGoogle(
    createClient().auth,
    buildCallbackUrl(window.location.origin, next),
  );
}
