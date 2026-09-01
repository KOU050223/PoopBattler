#!/usr/bin/env bash
# src/types/database.types.ts が supabase/migrations/ の現状と一致するかを検証する。
# マイグレーションを変更したまま型を再生成し忘れた場合に落とす。
#
# 既に起動しているローカルDBがあればそれを使い、無ければ一時的にDBだけ起動する。
set -euo pipefail

cd "$(dirname "$0")/.."

GENERATED="src/types/database.types.ts"
STARTED_BY_SCRIPT=0

cleanup() {
  if [ "$STARTED_BY_SCRIPT" -eq 1 ]; then
    supabase stop --no-backup >/dev/null 2>&1 || true
  fi
  rm -f "$TMPFILE"
}

TMPFILE="$(mktemp)"
trap cleanup EXIT

if ! supabase status >/dev/null 2>&1; then
  echo "ローカルDBを起動する..."
  # 型生成にはDBだけあればよい。他のコンテナは起動しない。
  supabase start -x \
    gotrue,realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor \
    >/dev/null
  STARTED_BY_SCRIPT=1
fi

supabase gen types --local --lang typescript > "$TMPFILE"

if ! diff -u "$GENERATED" "$TMPFILE"; then
  echo ""
  echo "エラー: $GENERATED がマイグレーションと一致しない。"
  echo "  npm run db:types を実行して生成し直し、結果をコミットすること。"
  exit 1
fi

echo "OK: $GENERATED はマイグレーションと一致している。"
