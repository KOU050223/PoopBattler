import { toAccountStatus, type AccountStatus } from "@/features/account/account.types";

import { createClient } from "./client";

// ヘッダーはページ遷移をまたいで出続けるため、サーバーで読んだ状態を
// 初期値として使えない。匿名サインインはブラウザで行われ、初回訪問では
// サーバー側にまだセッションが無いからである（AnonymousSignIn 参照）。
//
// docs/architecture.md「責務のルール」3 のとおり、ここでも Supabase
// クライアントの生成は lib/supabase/ の内側に閉じ込め、UI には
// AccountStatus だけを渡す（anonymous-session.ts / google-identity.ts と同じ形）。

type UserLike = {
  is_anonymous?: boolean;
  email?: string | null;
  identities?: { provider: string }[] | null;
};

/** ブラウザ側で必要な auth API だけを写し取った最小のインターフェース。 */
export type AccountWatchAuth = {
  getUser: () => Promise<{ data: { user: UserLike | null } }>;
  onAuthStateChange: (
    callback: () => void,
  ) => { data: { subscription: { unsubscribe: () => void } } };
};

/**
 * 現在のアカウント状態を購読する。呼んだ直後に一度 `onChange` を呼び、
 * 以降は認証状態が変わるたびに呼ぶ。戻り値は購読を止める関数。
 *
 * 匿名サインインの完了も `onAuthStateChange` で届くため、
 * 呼び出し側が完了通知を受け取る仕組みを別に持つ必要はない。
 */
export function watchAccountStatus(
  auth: AccountWatchAuth,
  onChange: (status: AccountStatus) => void,
): () => void {
  let active = true;

  const read = async () => {
    try {
      const { data } = await auth.getUser();
      if (active) onChange(toAccountStatus(data.user));
    } catch {
      // 読めない場合は「未サインイン」として扱う。ヘッダーは補助的な
      // 表示なので、ここでエラーを出して画面上部を占有しない。
      if (active) onChange(toAccountStatus(null));
    }
  };

  void read();

  const { data } = auth.onAuthStateChange(() => {
    void read();
  });

  return () => {
    active = false;
    data.subscription.unsubscribe();
  };
}

export function watchAccountStatusFromBrowser(
  onChange: (status: AccountStatus) => void,
): () => void {
  const { auth } = createClient();

  return watchAccountStatus(
    {
      getUser: () => auth.getUser(),
      onAuthStateChange: (callback) => auth.onAuthStateChange(() => callback()),
    },
    onChange,
  );
}
