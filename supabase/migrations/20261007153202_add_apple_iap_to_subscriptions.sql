-- Apple のアプリ内課金（RevenueCat 経由）の購読を subscriptions に載せる。
--
-- 権利の正はこのテーブル一本のまま、provider で提供元を区別する。
-- Web 版の Stripe 導線は変えない。IAP 側は RevenueCat の webhook が
-- service role で書き込む（Stripe webhook と同じ経路構造）。
--
-- Apple の購読は stripe_customer_id / stripe_subscription_id を持たないため
-- 両列の NOT NULL を外す。stripe_subscription_id の UNIQUE は残す
-- （Postgres の UNIQUE は複数の NULL を許すため Apple 行同士は衝突しない）。
-- Apple 側の安定IDは original_transaction_id で、専用の列に持つ。

alter table public.subscriptions
  -- 提供元。既存行はすべて Stripe 由来なので default で 'stripe' に埋まる。
  -- 値は webhook の書き込み側だけが使う閉じた語彙なので CHECK で固定する
  -- （status に CHECK を付けないのと違い、こちらは外部の語彙ではない）。
  add column provider text not null default 'stripe'
    check (provider in ('stripe', 'apple')),
  -- Apple 購読を一意に識別する ID（Stripe の subscription id 相当）。
  add column apple_original_transaction_id text;

-- UNIQUE 制約が裏に btree インデックスを作るため、検索用の index は別途要らない。
alter table public.subscriptions
  add constraint subscriptions_apple_original_transaction_id_key
    unique (apple_original_transaction_id);

alter table public.subscriptions
  alter column stripe_customer_id drop not null,
  alter column stripe_subscription_id drop not null;

comment on column public.subscriptions.provider is
  '課金の提供元（stripe / apple）。書き込んだ webhook のプロバイダ。';
comment on column public.subscriptions.apple_original_transaction_id is
  'RevenueCat / App Store の original_transaction_id。Apple 購読のイベントを突合する安定ID。';
