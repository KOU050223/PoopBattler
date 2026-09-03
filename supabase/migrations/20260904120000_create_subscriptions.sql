-- レポート分析の閲覧権利（サブスクリプション）を保持する。
--
-- 方針
-- 1. この表はクライアントから見て「読み取り専用の事実」である。権利を書けるのは
--    Stripe の Webhook（service role）だけで、SELECT ポリシーしか作らない。
--    bowel_logs / user_characters と同じ考え方（自分で図鑑を埋められないのと同様、
--    自分で権利を立てられない）。
-- 2. `to authenticated` を必ず付ける。匿名サインインのJWTロールは `anon` ではなく
--    `authenticated`（`is_anonymous: true`）。
-- 3. `auth.uid()` は `(select auth.uid())` と書く。initPlan として1回だけ評価される。
-- 4. Stripe と Supabase ユーザーの対応付けはメールアドレスではなく ID で行う。
--    メールは Google 側で変更されうるため、照合キーにすると黙って壊れる。

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  -- 1ユーザーにつき1行。Webhook は user_id で upsert する。
  user_id uuid not null unique references auth.users(id) on delete cascade,
  -- Stripe 側の顧客と定期購読。以降のイベントはこの2つで解決する。
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  -- Stripe の subscription.status をそのまま持つ。
  -- 権利判定は src/features/report/report-access.ts の hasActiveEntitlement が行い、
  -- どの status を有効とみなすかはアプリ側の決定としてコードに置く。
  -- ここで CHECK に列挙すると、Stripe が status を増やしたとき Webhook が
  -- 書き込みに失敗して権利が更新されなくなる（失敗より黙って古い権利が残る方が危険）。
  status text not null,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Webhook は customer.subscription.* を stripe_customer_id で引く。
create index subscriptions_stripe_customer_id_idx
  on public.subscriptions (stripe_customer_id);

alter table public.subscriptions enable row level security;

-- ---------------------------------------------------------------------------
-- subscriptions: 本人が SELECT だけできる
-- ---------------------------------------------------------------------------
-- INSERT / UPDATE / DELETE ポリシーは作らない。RLS有効かつポリシー不在で
-- 全ロールから拒否され、service role（RLSをバイパスする）だけが書ける。
create policy "subscriptions_select_own"
  on public.subscriptions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- テーブル権限（RLSの手前の防御線）
-- ---------------------------------------------------------------------------
-- 20260902100000 と同じく、一度すべて剥がしてから必要なものだけ grant する。
-- TRUNCATE / MAINTAIN は行単位の権限ではないため RLS が効かない。
revoke all on public.subscriptions from anon, authenticated;

-- 権利の確認のため本人が読むだけ。書き込みは Webhook のみ。
grant select on public.subscriptions to authenticated;
