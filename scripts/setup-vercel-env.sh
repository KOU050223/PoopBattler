#!/usr/bin/env bash
# 本番デプロイに必要な環境変数を Vercel へ登録する。
#
# 値はこのファイルにも Git にも書かない。実行時に対話で入力するか、
# 環境変数で渡す。入力した値は Vercel 側にのみ保存される。
#
# 使い方:
#   ./scripts/setup-vercel-env.sh production
#   ./scripts/setup-vercel-env.sh preview
#
# 事前に `npx vercel login` と `npx vercel link` を済ませておくこと。

set -euo pipefail

TARGET="${1:-}"
case "$TARGET" in
  production|preview|development) ;;
  *)
    echo "使い方: $0 <production|preview|development>" >&2
    echo >&2
    echo "  production  … 本番。sk_live_ と本番Supabaseを入れる" >&2
    echo "  preview     … PRごとのプレビュー。sk_test_ を入れる" >&2
    echo "                （本番の鍵を入れるとプレビューから本物の決済ができてしまう）" >&2
    exit 1
    ;;
esac

if [ ! -d .vercel ]; then
  echo "Vercel プロジェクトにリンクされていません。先に実行してください:" >&2
  echo "  npx vercel login" >&2
  echo "  npx vercel link" >&2
  exit 1
fi

VERCEL="npx --yes vercel@latest"

# NEXT_PUBLIC_ が付くものはブラウザへ配信される。付かないものはサーバー限定。
# SUPABASE_SERVICE_ROLE_KEY と STRIPE_SECRET_KEY に NEXT_PUBLIC_ を付けると
# クライアントバンドルへ埋め込まれ、誰でも読める状態になる。
VARS=(
  "NEXT_PUBLIC_SUPABASE_URL|SupabaseのプロジェクトURL（https://xxx.supabase.co）"
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|Supabaseの公開可能キー（sb_publishable_...）"
  "NEXT_PUBLIC_APP_URL|このアプリの公開URL（https://example.com、末尾のスラッシュ無し）"
  "SUPABASE_SERVICE_ROLE_KEY|SupabaseのService Roleキー（サーバー限定・RLSをバイパスする）"
  "STRIPE_SECRET_KEY|Stripeのシークレットキー（本番は sk_live_、プレビューは sk_test_）"
  "STRIPE_PRICE_ID|定期購読の価格ID（price_...）。本番用は scripts/create-stripe-price.sh で作る"
  "STRIPE_WEBHOOK_SECRET|Webhook署名シークレット（whsec_...）。Dashboardでエンドポイント登録後に発行される"
)

FAILED=()

echo "対象環境: ${TARGET}"
echo "登録する変数: ${#VARS[@]} 個"
echo
echo "値の入力を求められます。既に登録済みの変数は上書きの可否を聞かれます。"
echo

for entry in "${VARS[@]}"; do
  name="${entry%%|*}"
  desc="${entry#*|}"

  echo "─────────────────────────────────────────"
  echo "  ${name}"
  echo "  ${desc}"
  echo

  # 値は標準入力から Vercel CLI へ直接渡す。引数に置くとシェル履歴や
  # プロセス一覧から見えてしまう。
  if ! $VERCEL env add "$name" "$TARGET"; then
    echo "  ※ ${name} の登録をスキップまたは失敗しました" >&2
    FAILED+=("$name")
  fi
  echo
done

echo "─────────────────────────────────────────"
echo "登録内容の確認:"
echo "  npx vercel env ls ${TARGET}"
echo
echo "Webhook のエンドポイント登録がまだなら、Stripe Dashboard で:"
echo "  URL    : <NEXT_PUBLIC_APP_URL>/api/stripe/webhook"
echo "  イベント: checkout.session.completed"
echo "            checkout.session.async_payment_succeeded"
echo "            checkout.session.async_payment_failed"
echo "            customer.subscription.updated"
echo "            customer.subscription.deleted"
echo "登録すると whsec_... が発行されるので、STRIPE_WEBHOOK_SECRET に入れ直す。"

# 1つでも失敗したまま成功として終わらせない。設定が欠けたまま
# 「終わった」と見なすと、決済は通るのに権利が付かない状態で公開されうる。
if [ ${#FAILED[@]} -gt 0 ]; then
  echo >&2
  echo "登録できなかった変数があります: ${FAILED[*]}" >&2
  exit 1
fi
