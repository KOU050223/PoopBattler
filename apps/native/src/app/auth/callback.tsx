import { Redirect } from "expo-router";

/**
 * poopbattler://auth/callback の受け口。
 *
 * iOS では ASWebAuthenticationSession がコールバックを捕まえてアプリには
 * 届かないが、Android では deep link が router にも届きうる。届いた場合に
 * 迷子にならないようアカウント画面へ戻す（実際のトークン処理は
 * google-identity.ts が openAuthSessionAsync の戻り値で行う）。
 */
export default function AuthCallback() {
  return <Redirect href="/(tabs)/account" />;
}
