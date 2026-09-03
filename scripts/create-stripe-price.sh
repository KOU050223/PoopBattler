#!/usr/bin/env bash
# 本番モードのStripeに、レポート分析の商品と定期購読の価格を作る。
#
# テストモードの価格IDは本番モードには存在しない。本番へデプロイする前に
# 一度だけ実行し、出力された price_... を Vercel の STRIPE_PRICE_ID に入れる。
#
# 前提: Stripe Dashboard で事業者情報の登録・審査が済み、本番の鍵
# （sk_live_...）が発行されていること。サンドボックスのままでは実行できない。
#
# 使い方:
#   STRIPE_SECRET_KEY=sk_live_xxx ./scripts/create-stripe-price.sh
#   STRIPE_SECRET_KEY=sk_live_xxx AMOUNT=980 ./scripts/create-stripe-price.sh

set -euo pipefail

: "${STRIPE_SECRET_KEY:?STRIPE_SECRET_KEY を指定してください（例: STRIPE_SECRET_KEY=sk_live_xxx $0）}"

AMOUNT="${AMOUNT:-480}"
CURRENCY="${CURRENCY:-jpy}"
PRODUCT_NAME="${PRODUCT_NAME:-PoopBattler プレミアム}"
PRODUCT_DESC="${PRODUCT_DESC:-週次レポートの詳細分析}"

api() {
  local path="$1"; shift
  local response status body
  response=$(curl -sS -w $'\n%{http_code}' "https://api.stripe.com/v1/${path}" \
    -u "${STRIPE_SECRET_KEY}:" "$@")
  status="${response##*$'\n'}"
  body="${response%$'\n'*}"

  # 2xx 以外を成功として扱わない。Stripe はエラーも整形されたJSONで返すため、
  # ステータスを見ないと「作成できていないのにIDを探して空になる」形で失敗する。
  if [ "$status" -lt 200 ] || [ "$status" -ge 300 ]; then
    echo "Stripe API エラー (HTTP ${status}):" >&2
    # JSONで返らない場合（ネットワーク機器のエラーページ等）もあるため、
    # 解析に失敗したら本文をそのまま出す。
    printf '%s' "$body" | python3 -c '
import sys, json
raw = sys.stdin.read()
try:
    print("  " + json.loads(raw).get("error", {}).get("message", "(詳細不明)"))
except Exception:
    print("  " + (raw.strip()[:300] or "(応答が空)"))
' >&2
    exit 1
  fi
  echo "$body"
}

json_get() {
  python3 -c 'import sys,json; print(json.load(sys.stdin)["'"$1"'"])'
}

# 本番の鍵かどうかを知らせる。テストモードの鍵でも動くが、その場合に作られる
# 価格は本番では使えないため、取り違えに気づけるようにしておく。
case "$STRIPE_SECRET_KEY" in
  sk_live_*) MODE="本番 (live)" ;;
  sk_test_*) MODE="テスト (test)" ;;
  *)         MODE="不明" ;;
esac

echo "モード : ${MODE}"
echo "商品名 : ${PRODUCT_NAME}"
echo "価格   : ${AMOUNT} ${CURRENCY} / 月"
echo

# api の失敗で確実に止めるため、パイプでつながず一度変数へ受ける。
# $(api ... | json_get) の形だと api 側の exit がパイプの左側で止まるだけで、
# json_get が空入力のまま走ってしまう。
PRODUCT_JSON=$(api products \
  -d "name=${PRODUCT_NAME}" \
  -d "description=${PRODUCT_DESC}")
PRODUCT_ID=$(printf '%s' "$PRODUCT_JSON" | json_get id)
echo "product : ${PRODUCT_ID}"

PRICE_JSON=$(api prices \
  -d "product=${PRODUCT_ID}" \
  -d "unit_amount=${AMOUNT}" \
  -d "currency=${CURRENCY}" \
  -d "recurring[interval]=month")
PRICE_ID=$(printf '%s' "$PRICE_JSON" | json_get id)

echo "price   : ${PRICE_ID}"
echo
echo "次の手順:"
echo "  1. この price ID を Vercel の STRIPE_PRICE_ID に設定する"
echo "     npx vercel env add STRIPE_PRICE_ID production"
echo "  2. 値の入力を求められたら ${PRICE_ID} を貼り付ける"
