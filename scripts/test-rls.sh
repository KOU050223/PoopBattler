#!/usr/bin/env bash
# scripts/sql/rls-verify.sql を、マイグレーション適用済みのローカルDBに対して実行する。
#
# 既に起動しているローカルDBがあればそれを使い、無ければ一時的にDBだけ起動する。
# テスト自体はトランザクション内で完結し、最後に rollback するのでデータは残らない。
set -euo pipefail

cd "$(dirname "$0")/.."

STARTED_BY_SCRIPT=0

cleanup() {
  if [ "$STARTED_BY_SCRIPT" -eq 1 ]; then
    # --no-backup は付けない。このスクリプトが起動したのはコンテナだけで、
    # データボリューム自体は以前から存在しているかもしれないため、消さずに止める。
    supabase stop >/dev/null 2>&1 || true
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
# 別のSupabaseプロジェクトが同時に起動していることがあるので、コンテナ名は
# config.toml の project_id で完全一致させる。前方一致で拾うと、無関係の
# プロジェクトのDBに対して検査を通してしまう。
PROJECT="$(grep -m1 '^project_id' supabase/config.toml | sed 's/.*= *"\(.*\)"/\1/')"
CONTAINER="supabase_db_${PROJECT}"

if ! docker ps --filter "name=^${CONTAINER}$" --format '{{.Names}}' | grep -q .; then
  echo "エラー: DBコンテナ ${CONTAINER} が見つからない。" >&2
  exit 1
fi

psql_q() {
  docker exec -i "$CONTAINER" psql -tAqv ON_ERROR_STOP=1 -U postgres -d postgres -c "$1"
}

# 起動済みのスタックを使う場合、チェックアウトしたマイグレーションがまだ適用
# されていないことがある。その状態で検査すると「ポリシーが無い」ことによる失敗が
# 出るが、原因はポリシーではなく未適用なので、先に切り分けて落とす。
APPLIED="$(psql_q "select coalesce(max(version), '') from supabase_migrations.schema_migrations")"
LATEST="$(basename "$(ls supabase/migrations/*.sql | tail -1)" | cut -d_ -f1)"

if [ "$APPLIED" != "$LATEST" ]; then
  echo "エラー: マイグレーションが最新でない（適用済み: ${APPLIED:-なし} / 最新: ${LATEST}）。" >&2
  echo "  supabase db reset を実行してから再実行すること。" >&2
  exit 1
fi

# 検証データは seed.sql のキャラクター（curry-poop など）を外部キーで参照する。
# seed が入っていないとFK違反になり、RLSと無関係な失敗に見えてしまう。
if [ "$(psql_q "select count(*) from public.characters")" = "0" ]; then
  echo "エラー: public.characters が空。seed.sql が適用されていない。" >&2
  echo "  supabase db reset を実行してから再実行すること。" >&2
  exit 1
fi

docker exec -i "$CONTAINER" psql -v ON_ERROR_STOP=1 -U postgres -d postgres \
  < scripts/sql/rls-verify.sql

echo ""
echo "OK: RLSポリシーは期待どおり。"
