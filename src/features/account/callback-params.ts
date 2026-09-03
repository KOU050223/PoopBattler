/**
 * ホーム画面が受け取りうるコールバックの結果パラメータを読む。
 *
 * `/auth/callback` を経た場合は `?auth_error=` に正規化されて戻る。
 * しかし Supabase(GoTrue) は `redirectTo` が Redirect URLs の許可リストに
 * 一致しないとき、エラーを付けたまま Site URL（＝ここ）へ直接戻す。
 * その場合は `?error_code=` / `?error=` という素の名前で載るため、
 * どちらの形でも拾わないと「エラーなのに何も出ない」画面になる。
 *
 * なお同じ値はフラグメント（`#error=...`）にも複製されるが、
 * フラグメントはサーバーへ送られない。ここはServer Componentから使うため
 * クエリ側だけを読む。観測された本番URLはクエリにも載っている。
 */

export type CallbackParams = {
  [key: string]: string | string[] | undefined;
};

export function firstValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;

  return value ?? null;
}

/** 表示すべきエラーコード。無ければ null。 */
export function readAuthErrorCode(params: CallbackParams): string | null {
  return (
    firstValue(params.auth_error)
    ?? firstValue(params.error_code)
    ?? firstValue(params.error)
  );
}

/**
 * 連携成功として扱ってよいか。
 *
 * URLのパラメータだけを信じない。`?auth_linked=1` は履歴や共有で後から
 * 再訪でき、匿名のままの利用者に「連携できた＝記録は復旧できる」と誤って
 * 伝えてしまう。サーバーで読んだ実際の状態と一致したときだけ成功を出す。
 */
export function readAuthLinked(
  params: CallbackParams,
  hasGoogleIdentity: boolean,
): boolean {
  return firstValue(params.auth_linked) === "1" && hasGoogleIdentity;
}
