// apps/web/src/lib/supabase/anonymous-session.ts と同じ意図:
// 既存セッションが有効なら再利用し、復旧可能な無効セッションだけ破棄して匿名サインインし直す。
type AuthError = { message: string; code?: string };

export type AnonymousSessionAuth = {
  getSession: () => Promise<{ data: { session: object | null }; error: AuthError | null }>;
  getUser: () => Promise<{ data: { user: object | null }; error: AuthError | null }>;
  signOut: (options?: { scope?: "global" | "local" | "others" }) => Promise<{ error: AuthError | null }>;
  signInAnonymously: () => Promise<{ data: { user: object | null }; error: AuthError | null }>;
};

export type AnonymousSessionResult = { status: "ready" } | { status: "error"; message: string };

function isRecoverableInvalidSession(error: AuthError | null): boolean {
  if (!error) return false;
  const message = error.message.toLowerCase();
  return (
    error.code === "refresh_token_not_found" ||
    error.code === "session_not_found" ||
    message.includes("refresh token") ||
    message.includes("user from sub claim in jwt does not exist")
  );
}

export async function ensureAnonymousSession(
  auth: AnonymousSessionAuth,
): Promise<AnonymousSessionResult> {
  const { data: sessionData, error: sessionError } = await auth.getSession();
  if (sessionError) return { status: "error", message: sessionError.message };

  if (sessionData.session) {
    const { data: userData, error: userError } = await auth.getUser();
    if (!userError && userData.user) return { status: "ready" };
    if (!isRecoverableInvalidSession(userError)) {
      return { status: "error", message: userError?.message ?? "セッションを確認できません" };
    }
    await auth.signOut({ scope: "local" });
  }

  const { data, error } = await auth.signInAnonymously();
  if (error) return { status: "error", message: error.message };
  if (!data.user) return { status: "error", message: "もう一度お試しください。" };
  return { status: "ready" };
}
