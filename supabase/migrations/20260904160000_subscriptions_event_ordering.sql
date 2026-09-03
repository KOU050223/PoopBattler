-- 購読の更新に、Stripeイベントの発生時刻を持たせる。
--
-- Stripe はイベントの配信順を保証しない。到着順で無条件に上書きすると、
-- 「解約(deleted)が先に着いて canceled になった行を、後から着いた古い
-- updated が active へ戻す」ことが起きる。権利が復活したまま残るため、
-- 失敗として気づけない。
--
-- そこで行に「その行を最後に書いたイベントの発生時刻」を持たせ、
-- それより古いイベントの更新を無視する。到着順ではなく発生順を正とする。

alter table public.subscriptions
  add column last_event_at timestamptz;

comment on column public.subscriptions.last_event_at is
  'この行を最後に更新した Stripe イベントの created。これより古いイベントは無視する。';

-- 既存行（このマイグレーション以前に書かれたもの）は発生時刻を持たない。
-- null は「未知」として扱い、次に届いたイベントを必ず受け入れる。
-- ここで now() を入れると、既存行への正当な更新を取りこぼす。
