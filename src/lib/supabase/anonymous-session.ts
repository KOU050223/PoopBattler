import { createClient } from "./client";

type AuthError = {
  message: string;
};

export type AnonymousSessionAuth = {
  getSession: () => Promise<{
    data: { session: object | null };
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

export async function ensureAnonymousSession(
  auth: AnonymousSessionAuth,
): Promise<AnonymousSessionResult> {
  const { data: sessionData, error: sessionError } = await auth.getSession();

  if (sessionError) {
    return { status: "error", message: sessionError.message };
  }

  if (sessionData.session) {
    return { status: "ready" };
  }

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

// 匿名サインインだけを公開し、DB操作が可能なクライアントをUIへ渡さないための入口。
// これによりコンポーネント側はデータアクセス境界の例外を必要としない。
export async function signInAnonymouslyFromBrowser(): Promise<AnonymousSessionResult> {
  return ensureAnonymousSession(createClient().auth);
}
