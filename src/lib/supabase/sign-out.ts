import { createClient } from "./client";

// docs/architecture.md「責務のルール」3 のとおり、Supabaseクライアントの生成は
// このモジュールの内側へ閉じ込め、UIには結果だけを返す
// （anonymous-session.ts / google-identity.ts と同じ形）。

type AuthError = {
  message: string;
};

/** ブラウザ側で必要な auth API だけを写し取った最小のインターフェース。 */
export type SignOutAuth = {
  signOut: () => Promise<{ error: AuthError | null }>;
};

export type SignOutResult =
  | { status: "signed-out" }
  | { status: "error"; message: string };

/** 想定外の失敗で Supabase の英語メッセージをそのまま見せないための既定文言。 */
const SIGN_OUT_ERROR_MESSAGE =
  "ログアウトに失敗しました。時間をおいてもう一度お試しください。";

export async function signOut(auth: SignOutAuth): Promise<SignOutResult> {
  try {
    const { error } = await auth.signOut();

    if (error) {
      return { status: "error", message: SIGN_OUT_ERROR_MESSAGE };
    }

    return { status: "signed-out" };
  } catch {
    return { status: "error", message: SIGN_OUT_ERROR_MESSAGE };
  }
}

export async function signOutFromBrowser(): Promise<SignOutResult> {
  return signOut(createClient().auth);
}
