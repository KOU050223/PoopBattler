#!/usr/bin/env bash
# ローカルSupabaseスタックとNext.jsの開発サーバーをまとめて起動する。
#
# 手で `supabase start` と `npm run dev` を叩くのと違うのは次の2点で、
# どちらも「失敗する」ではなく「黙って間違う」経路を塞ぐためにある。
#
# 1. 起動前に設定の欠落を確かめる。config.toml の
#    `env(SUPABASE_AUTH_EXTERNAL_GOOGLE_*)` は Supabase CLI が `supabase/.env`
#    から解決する。空のままだとプロバイダは「有効だが認証情報が空」で起動し、
#    Googleの画面まで進んでから invalid_client で落ちる。
#
# 2. 起動済みでも必ず停止してから起動し直す。
#    認証コンテナは config.toml を起動時にしか読まない。起動済みを再利用すると、
#    config.toml を編集済みでも古い設定のまま動き、エラーも出ない。
#    `supabase status` が通ることは「設定が最新であること」を意味しない。
#
# 停止に --no-backup は付けないため、DBのデータは消えない。
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then
  echo "エラー: .env.local が無い。.env.local.example をコピーして値を埋めること。" >&2
  exit 1
fi

# set -a で、この後の代入を自動的に export する。
set -a
# shellcheck disable=SC1091
. ./.env.local
# Supabase CLI は supabase/.env を自分で読む。ここで読むのは、下の検査で
# 値の有無を見るためだけ（読めなくても CLI 側の解決には影響しない）。
# shellcheck disable=SC1091
[ -f supabase/.env ] && . ./supabase/.env
set +a

# ローカルスタックに繋いでいないなら、起動しても使われない。黙って本番を
# 触り続ける事故になるため、先に気づけるようにする。
case "${NEXT_PUBLIC_SUPABASE_URL:-}" in
  *127.0.0.1:54321*|*localhost:54321*) ;;
  "")
    echo "エラー: NEXT_PUBLIC_SUPABASE_URL が未設定。" >&2
    exit 1
    ;;
  *)
    echo "警告: NEXT_PUBLIC_SUPABASE_URL がローカルを指していない:" >&2
    echo "  $NEXT_PUBLIC_SUPABASE_URL" >&2
    echo "  このまま起動すると、ローカルスタックではなくこの接続先を使う。" >&2
    echo "  ローカルで開発するなら http://127.0.0.1:54321 に変更すること。" >&2
    echo "" >&2
    ;;
esac

echo "ローカルスタックを起動し直す（config.toml の変更を反映するため）..."
supabase stop >/dev/null 2>&1 || true
supabase start -x imgproxy,edge-runtime,supavisor

# 起動しただけでは、認証プロバイダが実際に使える状態かは分からない。
# 設定漏れをGoogleの画面まで進んでから気づくのを避けるため、ここで確かめる。
if grep -qs '^enabled = true' <(sed -n '/\[auth.external.google\]/,/^\[auth\.external\./p' supabase/config.toml); then
  # code_challenge は43〜128文字でないと、プロバイダの状態を見る前に
  # 長さ検証で弾かれる。短い値を使うと、設定が正しくても警告が出てしまう。
  challenge="probe0000000000000000000000000000000000000000"
  probe=$(curl -s "http://127.0.0.1:54321/auth/v1/authorize?provider=google&redirect_to=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback&code_challenge=${challenge}&code_challenge_method=s256&skip_http_redirect=true" || true)
  # Secret は authorize の段階では使われない（Googleのコールバックを
  # Supabaseが交換するときに初めて要る）ため、authorize の応答をいくら
  # 見ても欠落を検出できない。変数そのものを先に確かめる。
  for var in SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET; do
    value="${!var:-}"
    case "$value" in
      "")
        echo "警告: $var が空。Googleの往復は完了しない。" >&2
        echo "  supabase/.env に設定すること（supabase/.env.example 参照）。" >&2
        ;;
      "env("*)
        echo "警告: $var が未解決のまま（$value）。" >&2
        ;;
    esac
  done

  # 「accounts.google.com へのURLが返るか」では不十分。環境変数が空のとき
  # Supabase は config.toml の `env(...)` を展開できず、その文字列を
  # client_id にそのまま載せたURLを返す。Googleの画面まで進んでから
  # invalid_client で落ちるので、ここで client_id の中身まで見る。
  case "$probe" in
    *"client_id=env%28"*|*"client_id=&"*|*"client_id="[\&\"]*)
      echo "警告: Googleの認証情報が読めていない（client_idが未解決）。" >&2
      echo "  .env.local の SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID / _SECRET を確認すること。" >&2
      ;;
    *accounts.google.com*client_id=*)
      # Secret の正しさまでは確かめていない（実際の交換でしか分からない）。
      echo "Googleプロバイダ: client_id 解決OK"
      ;;
    *)
      echo "警告: Googleプロバイダが使えない状態:" >&2
      echo "  $probe" >&2
      ;;
  esac
fi

echo ""
npm run dev
