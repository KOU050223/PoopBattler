-- ユーザーごとに同時にactiveなバトルは1件までにする（Issue #21 実装計画5）。
--
-- startBattleAction は既存のactiveバトルがあれば再開する方針だが、
-- アプリ側の「読んでから書く」だけでは同時実行を防げない。
-- Server Actionのクライアント側直列化は1クライアント内の話であり、
-- 2つのタブや2端末からの同時開始は素通りする。
-- 判断をDBの制約として表現し、競合したINSERTを失敗させる。

-- 既存データの整理を先に行う。
-- この制約より前のマイグレーションでは同一ユーザーの active が複数あり得るため、
-- いきなり unique index を作ると duplicate key で db push 全体が失敗する。
-- 最新の1件だけを active として残し、それ以外は completed に倒す。
--
-- 並び順は (started_at, id) で決める。started_at だけだと同時刻の行で
-- 順位が確定せず、2件残って再び制約に引っかかる余地がある。
with ranked as (
  select
    id,
    row_number() over (
      partition by user_id
      order by started_at desc, id desc
    ) as rn
  from public.battle_results
  where status = 'active'
)
update public.battle_results as b
set status = 'completed'
from ranked
where b.id = ranked.id
  and ranked.rn > 1;

create unique index battle_results_one_active_per_user_idx
  on public.battle_results (user_id)
  where status = 'active';

comment on index public.battle_results_one_active_per_user_idx is
  '進行中のバトルはユーザーごとに1件まで。完了済み(won/completed)は対象外。';
