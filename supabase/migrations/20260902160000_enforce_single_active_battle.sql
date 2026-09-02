-- ユーザーごとに同時にactiveなバトルは1件までにする（Issue #21 実装計画5）。
--
-- startBattleAction は既存のactiveバトルがあれば再開する方針だが、
-- アプリ側の「読んでから書く」だけでは同時実行を防げない。
-- Server Actionのクライアント側直列化は1クライアント内の話であり、
-- 2つのタブや2端末からの同時開始は素通りする。
-- 判断をDBの制約として表現し、競合したINSERTを失敗させる。
create unique index battle_results_one_active_per_user_idx
  on public.battle_results (user_id)
  where status = 'active';

comment on index public.battle_results_one_active_per_user_idx is
  '進行中のバトルはユーザーごとに1件まで。完了済み(won/completed)は対象外。';
