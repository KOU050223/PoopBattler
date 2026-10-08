import { toAccountStatus, type AccountStatus } from "@poopbattler/domain/account/account.types";

// apps/web/src/lib/supabase/account-watch.ts の RN 版（同じ考え方）。

type UserLike = {
  is_anonymous?: boolean;
  email?: string | null;
  identities?: { provider: string }[] | null;
};

export type AccountWatchAuth = {
  getUser: () => Promise<{ data: { user: UserLike | null } }>;
  onAuthStateChange: (
    callback: () => void,
  ) => { data: { subscription: { unsubscribe: () => void } } };
};

/**
 * 現在のアカウント状態を購読する。呼んだ直後に一度 onChange を呼び、
 * 以降は認証状態が変わるたびに呼ぶ。戻り値は購読を止める関数。
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
