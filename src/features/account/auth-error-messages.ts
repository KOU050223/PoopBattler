// コールバックの `?auth_error=` に載るコードを、利用者が次に何をすればよいか
// 分かる日本語へ変換する。未知のコードは既定文言に落として黙って消さない。
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  identity_already_exists:
    "このGoogleアカウントは既に別のアカウントで使われています。データの統合は行えないため、"
    + "そのアカウントでログインし直すか、別のGoogleアカウントを選んでください。",
  manual_linking_disabled:
    "アカウント連携がサーバー側で有効になっていません。設定を確認してください。",
  access_denied: "Googleでの認証がキャンセルされました。",
  missing_code: "Googleからの応答を確認できませんでした。もう一度お試しください。",
  exchange_failed: "ログイン処理を完了できませんでした。もう一度お試しください。",
  // Googleプロバイダが未設定のまま導線を押したときに返る。
  validation_failed: "Googleログインがサーバー側で有効になっていません。設定を確認してください。",
  bad_oauth_state: "認証の途中で情報が失われました。最初からやり直してください。",
};

export const DEFAULT_AUTH_ERROR_MESSAGE =
  "Googleとの連携に失敗しました。時間をおいてもう一度お試しください。";
