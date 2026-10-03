-- 期間末での解約が予約されているかを保持する。
--
-- Stripe で cancel_at_period_end を立てても subscription.status は
-- 期間末まで active のまま変わらない。status と期限だけでは
-- 「解約予約済み」を区別できず、画面に「解約する」が出続ける。
-- Webhook が Stripe の値をそのまま同期する。

alter table public.subscriptions
  add column cancel_at_period_end boolean not null default false;

comment on column public.subscriptions.cancel_at_period_end is
  '期間末での解約が予約されているか（Stripe の cancel_at_period_end）。Webhook が同期する。';
