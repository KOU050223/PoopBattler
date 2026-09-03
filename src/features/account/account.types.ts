/** 画面がアカウントの状態を判断するために必要な最小限の情報。 */
export type AccountStatus = {
  /** サインインしていない（セッションを確認できない）。 */
  signedIn: boolean;
  /** 匿名ユーザーのまま。true の間はデータ消失の警告を出す。 */
  isAnonymous: boolean;
  /** Google の identity が紐づいているか。 */
  hasGoogleIdentity: boolean;
  /** 連携済みのメールアドレス。復旧の宛先として画面に表示する。 */
  email: string | null;
};

export const SIGNED_OUT_ACCOUNT_STATUS: AccountStatus = {
  signedIn: false,
  isAnonymous: false,
  hasGoogleIdentity: false,
  email: null,
};

type IdentityLike = { provider: string };

type UserLike = {
  is_anonymous?: boolean;
  email?: string | null;
  identities?: IdentityLike[] | null;
};

/**
 * Supabase の user から画面用の状態を作る。
 *
 * `is_anonymous` は昇格すると false になるが、それだけを見ると
 * 「メール連携で昇格したがGoogleは未連携」を区別できないため、
 * identities も併せて見る。
 */
export function toAccountStatus(user: UserLike | null): AccountStatus {
  if (!user) return SIGNED_OUT_ACCOUNT_STATUS;

  return {
    signedIn: true,
    isAnonymous: user.is_anonymous === true,
    hasGoogleIdentity:
      user.identities?.some((identity) => identity.provider === "google") ?? false,
    email: user.email ?? null,
  };
}
