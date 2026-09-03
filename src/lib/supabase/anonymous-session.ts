import { createClient } from "./client";

type AuthError = {
  message: string;
  code?: string;
};

export type AnonymousSessionAuth = {
  getSession: () => Promise<{
    data: { session: object | null };
    error: AuthError | null;
  }>;
  getUser: () => Promise<{
    data: { user: object | null };
    error: AuthError | null;
  }>;
  signOut: (options?: { scope?: "global" | "local" | "others" }) => Promise<{
    error: AuthError | null;
  }>;
  signInAnonymously: () => Promise<{
    data: { user: object | null };
    error: AuthError | null;
  }>;
};

export type AnonymousSessionResult =
  | { status: "ready" }
  | { status: "error"; message: string };

function isStaleRefreshToken(error: AuthError | null): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const message = error.message.toLowerCase();
  return code === "refresh_token_not_found"
    || code === "session_not_found"
    || message.includes("refresh token");
}

async function signInAnonymously(
  auth: AnonymousSessionAuth,
): Promise<AnonymousSessionResult> {
  const { data, error } = await auth.signInAnonymously();

  if (error) {
    return { status: "error", message: error.message };
  }

  if (!data.user) {
    return {
      status: "error",
      message: "もう一度お試しください。",
    };
  }

  return { status: "ready" };
}

export async function ensureAnonymousSession(
  auth: AnonymousSessionAuth,
): Promise<AnonymousSessionResult> {
  const { data: sessionData, error: sessionError } = await auth.getSession();

  if (sessionError) {
    return { status: "error", message: sessionError.message };
  }

  if (sessionData.session) {
    const { data: userData, error: userError } = await auth.getUser();
    if (!userError && userData.user) {
      return { status: "ready" };
    }

    if (!isStaleRefreshToken(userError)) {
      return {
        status: "error",
        message: userError?.message ?? "セッションを確認できません",
      };
    }

    await auth.signOut({ scope: "local" });
  }

  return signInAnonymously(auth);
}

// 匿名サインインだけを公開し、DB操作が可能なクライアントをUIへ渡さないための入口。
// これによりコンポーネント側はデータアクセス境界の例外を必要としない。
export async function signInAnonymouslyFromBrowser(): Promise<AnonymousSessionResult> {
  return ensureAnonymousSession(createClient().auth);
}
