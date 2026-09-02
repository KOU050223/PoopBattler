#!/usr/bin/env bash
# scripts/sql/rls-verify.sql を、マイグレーション適用直後のクリーンなDBに対して実行する。
#
# 既に起動しているローカルDBがあればそれを使い、無ければ一時的にDBだけ起動する。
# テスト自体はトランザクション内で完結し、最後に rollback するのでデータは残らない。
set -euo pipefail

cd "$(dirname "$0")/.."

STARTED_BY_SCRIPT=0

cleanup() {
  if [ "$STARTED_BY_SCRIPT" -eq 1 ]; then
    supabase stop --no-backup >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

if ! supabase status >/dev/null 2>&1; then
  echo "ローカルDBを起動する..."
  # RLSの検査に必要なのはDBだけなので、他のコンテナは起動しない。
  supabase start -x \
    gotrue,realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor \
    >/dev/null
  STARTED_BY_SCRIPT=1
fi

# psql はローカルに無い場合があるため、DBコンテナのものを使う。
CONTAINER="$(docker ps --filter 'name=supabase_db_' --format '{{.Names}}' | head -1)"
if [ -z "$CONTAINER" ]; then
  echo "エラー: SupabaseのDBコンテナが見つからない。" >&2
  exit 1
fi

# seed.sql の characters を前提にするため、テストは db reset 後の状態で走らせる。
docker exec -i "$CONTAINER" psql -v ON_ERROR_STOP=1 -U postgres -d postgres \
  < scripts/sql/rls-verify.sql

echo ""
echo "OK: RLSポリシーは期待どおり。"
