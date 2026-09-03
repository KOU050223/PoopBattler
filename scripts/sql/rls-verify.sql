-- ユーザー固有データのRLSポリシー検証。
--
-- supabase/tests/ ではなく scripts/sql/ に置く。supabase/tests/ は `supabase test db`
-- が走査するpgTAP用のディレクトリで、この形式のSQLを置くとそのコマンドが壊れる。
--
-- 実行方法（ローカルスタック起動中）:
--   npm run db:test:rls
--
-- 2人の匿名ユーザーを作り、「本人の行は許可・他人の行は全操作拒否」を検査する。
-- 1件でも期待と違えば raise exception で落ちるため、最後まで走れば合格。
--
-- 注意: postgres ロールは RLS をバイパスする（BYPASSRLS）。検査は必ず
-- `set local role authenticated` と `request.jwt.claims` の設定下で実行する。
-- これを忘れると全てのアサーションが素通りして「合格」に見えてしまう。

\set ON_ERROR_STOP on

begin;

-- ---------------------------------------------------------------------------
-- 準備: 匿名ユーザー2人分のデータを postgres ロールで作る
-- ---------------------------------------------------------------------------
-- profiles は auth.users への on_auth_user_created トリガーが作るため、
-- ここでは auth.users にだけ挿入する。
create temporary table rls_fixture (
  key text primary key,
  id uuid not null
) on commit drop;

insert into rls_fixture (key, id)
values
  ('user_a', gen_random_uuid()),
  ('user_b', gen_random_uuid()),
  ('user_empty', gen_random_uuid()),
  ('meal_a', gen_random_uuid()),
  ('meal_b', gen_random_uuid()),
  ('meal_rpc_a', gen_random_uuid()),
  ('battle_a', gen_random_uuid()),
  ('battle_b', gen_random_uuid()),
  ('battle_rpc_a', gen_random_uuid()),
  ('battle_rpc_empty', gen_random_uuid()),
  ('battle_rpc_photo_a', gen_random_uuid());

create or replace function pg_temp.fixture(p_key text)
returns uuid
language sql
stable
as $$ select id from rls_fixture where key = p_key $$;

-- 匿名サインインで作られる auth.users の行を模す（is_anonymous = true）。
insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
select
  f.id,
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  true,
  now(),
  now()
from rls_fixture f
where f.key in ('user_a', 'user_b', 'user_empty');

-- トリガーが実際に発火したかを先に確認する。ここが通らないと、
-- 以降の「他人の行が見えない」は単に行が無いだけになってしまう。
do $$
begin
  if (select count(*) from public.profiles
      where id in (
        pg_temp.fixture('user_a'),
        pg_temp.fixture('user_b'),
        pg_temp.fixture('user_empty')
      )) <> 3 then
    raise exception 'FAIL: on_auth_user_created が profiles を作っていない';
  end if;
end;
$$;

insert into public.meal_logs (id, user_id, image_path, tag)
values
  (pg_temp.fixture('meal_a'), pg_temp.fixture('user_a'), 'meals/a.jpg', 'curry'),
  (pg_temp.fixture('meal_b'), pg_temp.fixture('user_b'), 'meals/b.jpg', 'meat'),
  (pg_temp.fixture('meal_rpc_a'), pg_temp.fixture('user_a'), 'meals/rpc-a.jpg', 'curry');

-- status を completed にしておく。active はユーザーごと1件までの部分ユニーク
-- インデックスがあるため、fixture で active を占有すると後段の
-- 「battle_results INSERT 本人名義」が制約違反で落ちる。
-- 制約そのものは専用のケースで検査する。
insert into public.battle_results (id, user_id, meal_log_id, enemy_character_id, enemy_attribute, status)
values
  (pg_temp.fixture('battle_a'), pg_temp.fixture('user_a'), pg_temp.fixture('meal_a'), 'curry-poop', 'curry', 'completed'),
  (pg_temp.fixture('battle_b'), pg_temp.fixture('user_b'), pg_temp.fixture('meal_b'), 'meat-poop', 'meat', 'completed');

insert into public.bowel_logs (user_id, battle_result_id, hardness, amount, color, ease)
values
  (pg_temp.fixture('user_a'), pg_temp.fixture('battle_a'), 4, 'normal', 'brown', 'easy'),
  (pg_temp.fixture('user_b'), pg_temp.fixture('battle_b'), 3, 'small', 'yellow', 'normal');

insert into public.user_characters (user_id, character_id, acquired_from_battle_id)
values
  (pg_temp.fixture('user_a'), 'curry-poop', pg_temp.fixture('battle_a')),
  (pg_temp.fixture('user_b'), 'meat-poop', pg_temp.fixture('battle_b'));

-- ---------------------------------------------------------------------------
-- 検査用ヘルパー
-- ---------------------------------------------------------------------------
-- ユーザーAとしてSQLを実行し、期待どおりの結果かを判定する。
-- 例外を握り潰さないよう、判定対象は「拒否されたか」に限定する。

-- 指定ユーザーのセッションに切り替える。
create or replace function pg_temp.become(p_user uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', p_user::text,
      'role', 'authenticated',
      'is_anonymous', true
    )::text,
    true
  );
end;
$$;

-- complete_battle の検査はこの後で先に実行するため、拒否判定とアサーションの
-- 最小ヘルパーをここで定義する（後段のRLS検査でも同名関数を定義し直す）。
create or replace function pg_temp.allowed(p_sql text)
returns boolean
language plpgsql
as $$
declare
  affected bigint;
begin
  execute p_sql;
  get diagnostics affected = row_count;
  return affected > 0;
exception
  when insufficient_privilege or check_violation then
    return false;
end;
$$;

create or replace function pg_temp.expect(p_label text, p_actual boolean, p_expected boolean)
returns void
language plpgsql
as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'FAIL: % — 期待 % / 実際 %',
      p_label,
      case when p_expected then '許可' else '拒否' end,
      case when p_actual then '許可' else '拒否' end;
  end if;
  raise notice 'ok: %', p_label;
end;
$$;

-- ---------------------------------------------------------------------------
-- complete_battle RPC: 原子性・所有者・冪等性を検査する
-- ---------------------------------------------------------------------------
-- この専用バトルは、後段のRLS検査より前に完了まで済ませる。これにより
-- active の部分ユニークインデックスとRLS検査が干渉しない。
insert into public.battle_results (id, user_id, enemy_character_id, enemy_attribute)
values
  (
    pg_temp.fixture('battle_rpc_a'),
    pg_temp.fixture('user_a'),
    'curry-poop',
    'curry'
  ),
  (
    pg_temp.fixture('battle_rpc_empty'),
    pg_temp.fixture('user_empty'),
    'curry-poop',
    'curry'
  );

do $$
declare
  a uuid := pg_temp.fixture('user_a');
  b uuid := pg_temp.fixture('user_b');
  empty_user uuid := pg_temp.fixture('user_empty');
  meal_a uuid := pg_temp.fixture('meal_rpc_a');
  meal_b uuid := pg_temp.fixture('meal_b');
  battle_no_meal uuid := pg_temp.fixture('battle_rpc_a');
  battle_empty uuid := pg_temp.fixture('battle_rpc_empty');
  battle_with_meal uuid;
  first_result record;
  repeated_result record;
  empty_result record;
  started_photo_battle record;
  photo_result record;
  repeated_photo_result record;
begin
  perform pg_temp.expect(
    'companionship_chance 0件は0',
    private.companionship_chance(0) = 0,
    true);
  perform pg_temp.expect(
    'companionship_chance 1件は25%',
    private.companionship_chance(1) = 0.25,
    true);
  perform pg_temp.expect(
    'companionship_chance 4件は100%',
    private.companionship_chance(4) = 1,
    true);
  perform pg_temp.expect(
    'companionship_chance 5件も100%',
    private.companionship_chance(5) = 1,
    true);

  perform pg_temp.become(empty_user);

  -- 食事ログが1件も無いユーザーは、紐付けなし完了でも仲間化しない。
  select * into empty_result
  from public.complete_battle(battle_empty, 4::smallint, 'normal', 'brown', 'easy', null);
  perform pg_temp.expect(
    'complete_battle 食事ログ0件は仲間化しない',
    empty_result.status = 'completed'
      and empty_result.companionship_result = false
      and empty_result.character_id is null,
    true);

  perform pg_temp.become(a);

  -- 食事を今回紐付けなくても完了できる。排便ログをちょうど1件だけ作る。
  select * into first_result
  from public.complete_battle(battle_no_meal, 4::smallint, 'normal', 'brown', 'easy', null);
  perform pg_temp.expect(
    'complete_battle 紐付けなしでも完了する',
    first_result.status = 'completed',
    true);
  perform pg_temp.expect(
    'complete_battle 紐付けなしは排便ログを1件作る',
    (select count(*) = 1 from public.bowel_logs where battle_result_id = battle_no_meal),
    true);
  perform pg_temp.expect(
    'complete_battle 紐付けなしは meal_log_id を空のままにする',
    (select meal_log_id is null from public.battle_results where id = battle_no_meal),
    true);

  -- 同一バトルの再実行は、新しい排便ログも抽選も作らず既存結果を返す。
  select * into repeated_result
  from public.complete_battle(battle_no_meal, 1::smallint, 'small', 'green', 'hard', null);
  perform pg_temp.expect(
    'complete_battle 再実行は同じ結果を返す',
    repeated_result.status = first_result.status
      and repeated_result.companionship_result = first_result.companionship_result
      and repeated_result.character_id is not distinct from first_result.character_id,
    true);
  perform pg_temp.expect(
    'complete_battle 再実行で排便ログを増やさない',
    (select count(*) = 1 from public.bowel_logs where battle_result_id = battle_no_meal),
    true);

  -- 完了後は active が無いため、RPCで次のバトルを開始できる。
  select * into started_photo_battle from public.start_battle();
  battle_with_meal := started_photo_battle.battle_id;

  -- 他人の食事IDを渡した試行は、確定を残さず拒否する。
  perform pg_temp.expect(
    'complete_battle 他人の食事ログは拒否',
    pg_temp.allowed(format(
      'select * from public.complete_battle(%L, 4::smallint, ''normal'', ''brown'', ''easy'', %L)',
      battle_with_meal, meal_b)),
    false);
  perform pg_temp.expect(
    'complete_battle 拒否後に排便ログを残さない',
    (select count(*) = 0 from public.bowel_logs where battle_result_id = battle_with_meal),
    true);

  select * into photo_result
  from public.complete_battle(battle_with_meal, 4::smallint, 'normal', 'brown', 'easy', meal_a);
  perform pg_temp.expect(
    'complete_battle 食事ログを紐付けて完了する',
    photo_result.status = 'completed',
    true);
  perform pg_temp.expect(
    'complete_battle は本人の食事ログだけをバトルへ保存する',
    (select meal_log_id = meal_a from public.battle_results where id = battle_with_meal),
    true);
  perform pg_temp.expect(
    'complete_battle 仲間化成功時だけ所有キャラクターを作る',
    (photo_result.companionship_result and photo_result.character_id is not null
      and (select count(*) = 1 from public.user_characters where acquired_from_battle_id = battle_with_meal))
    or (not photo_result.companionship_result and photo_result.character_id is null
      and (select count(*) = 0 from public.user_characters where acquired_from_battle_id = battle_with_meal)),
    true);

  select * into repeated_photo_result
  from public.complete_battle(battle_with_meal, 7::smallint, 'large', 'green', 'hard', meal_a);
  perform pg_temp.expect(
    'complete_battle 紐付けありも再抽選しない',
    repeated_photo_result.companionship_result = photo_result.companionship_result
      and repeated_photo_result.character_id is not distinct from photo_result.character_id,
    true);

  perform pg_temp.become(b);
  perform pg_temp.expect(
    'complete_battle 他人のバトルは拒否',
    pg_temp.allowed(format(
      'select * from public.complete_battle(%L, 4::smallint, ''normal'', ''brown'', ''easy'', null)',
      battle_no_meal)),
    false);

  perform set_config('role', 'anon', true);
  perform pg_temp.expect(
    'complete_battle anon は実行できない',
    pg_temp.allowed(format(
      'select * from public.complete_battle(%L, 4::smallint, ''normal'', ''brown'', ''easy'', null)',
      battle_no_meal)),
    false);

  reset role;
end;
$$;

-- ---------------------------------------------------------------------------
-- start_battle RPC: 敵選定・active作成はサーバー側だけで行う
-- ---------------------------------------------------------------------------
do $$
declare
  a uuid := pg_temp.fixture('user_a');
  battle_first record;
  battle_repeated record;
begin
  perform pg_temp.become(a);

  select * into battle_first from public.start_battle();
  perform pg_temp.expect(
    'start_battle は新規activeバトルを作る',
    battle_first.resumed = false
      and (select status = 'active' and user_id = a and meal_log_id is null
           from public.battle_results where id = battle_first.battle_id),
    true);
  perform pg_temp.expect(
    'start_battle はサーバーが選んだ敵属性を保存する',
    (select enemy_attribute = battle_first.enemy_attribute
      and enemy_character_id = battle_first.enemy_character_id
     from public.battle_results where id = battle_first.battle_id),
    true);

  select * into battle_repeated from public.start_battle();
  perform pg_temp.expect(
    'start_battle 再実行はactiveバトルを再開する',
    battle_repeated.resumed
      and battle_repeated.battle_id = battle_first.battle_id,
    true);
  perform pg_temp.expect(
    'start_battle 再実行でactiveバトルを増やさない',
    (select count(*) = 1 from public.battle_results where user_id = a and status = 'active'),
    true);

  perform set_config('role', 'anon', true);
  perform pg_temp.expect(
    'start_battle anon は実行できない',
    pg_temp.allowed('select * from public.start_battle()'),
    false);

  reset role;
end;
$$;

-- SQLを実行し、行が変更（または取得）できたかを返す。RLSによる拒否は
-- 「0行」か「例外」のどちらでも起こりうるため、両方を false に畳む。
create or replace function pg_temp.allowed(p_sql text)
returns boolean
language plpgsql
as $$
declare
  affected bigint;
begin
  execute p_sql;
  get diagnostics affected = row_count;
  return affected > 0;
exception
  when insufficient_privilege or check_violation then
    return false;
end;
$$;

-- allowed() と同じだが、一意制約違反も「拒否」として畳む。
-- 部分ユニークインデックスによる拒否は unique_violation で飛んでくるため、
-- allowed() のままだと例外が外へ抜けてスクリプト全体が中断する。
create or replace function pg_temp.allowed_uniq(p_sql text)
returns boolean
language plpgsql
as $$
declare
  affected bigint;
begin
  execute p_sql;
  get diagnostics affected = row_count;
  return affected > 0;
exception
  when insufficient_privilege or check_violation or unique_violation then
    return false;
end;
$$;

-- 期待と実際が違えば落とす。
create or replace function pg_temp.expect(p_label text, p_actual boolean, p_expected boolean)
returns void
language plpgsql
as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'FAIL: % — 期待 % / 実際 %',
      p_label,
      case when p_expected then '許可' else '拒否' end,
      case when p_actual then '許可' else '拒否' end;
  end if;
  raise notice 'ok: %', p_label;
end;
$$;

-- ---------------------------------------------------------------------------
-- 検査本体: ユーザーAのセッションから、Aの行とBの行を突く
-- ---------------------------------------------------------------------------
do $$
declare
  a uuid := pg_temp.fixture('user_a');
  b uuid := pg_temp.fixture('user_b');
  meal_a uuid := pg_temp.fixture('meal_a');
  meal_b uuid := pg_temp.fixture('meal_b');
  battle_a uuid := pg_temp.fixture('battle_a');
  battle_b uuid := pg_temp.fixture('battle_b');
begin
  perform pg_temp.become(a);

  -- SELECT: 本人の行だけが見える -------------------------------------------
  perform pg_temp.expect(
    'meal_logs SELECT 本人',
    pg_temp.allowed(format('select 1 from public.meal_logs where id = %L', meal_a)),
    true);
  perform pg_temp.expect(
    'meal_logs SELECT 他人',
    pg_temp.allowed(format('select 1 from public.meal_logs where id = %L', meal_b)),
    false);

  perform pg_temp.expect(
    'battle_results SELECT 本人',
    pg_temp.allowed(format('select 1 from public.battle_results where id = %L', battle_a)),
    true);
  perform pg_temp.expect(
    'battle_results SELECT 他人',
    pg_temp.allowed(format('select 1 from public.battle_results where id = %L', battle_b)),
    false);

  perform pg_temp.expect(
    'bowel_logs SELECT 本人',
    pg_temp.allowed(format('select 1 from public.bowel_logs where user_id = %L', a)),
    true);
  perform pg_temp.expect(
    'bowel_logs SELECT 他人',
    pg_temp.allowed(format('select 1 from public.bowel_logs where user_id = %L', b)),
    false);

  perform pg_temp.expect(
    'user_characters SELECT 本人',
    pg_temp.allowed(format('select 1 from public.user_characters where user_id = %L', a)),
    true);
  perform pg_temp.expect(
    'user_characters SELECT 他人',
    pg_temp.allowed(format('select 1 from public.user_characters where user_id = %L', b)),
    false);

  -- INSERT: battle_resultsはRPCだけが作成する --------------------------------
  perform pg_temp.expect(
    'meal_logs INSERT 本人名義',
    pg_temp.allowed(format(
      'insert into public.meal_logs (user_id, image_path, tag) values (%L, ''meals/new.jpg'', ''curry'')', a)),
    true);
  perform pg_temp.expect(
    'meal_logs INSERT 他人名義（偽装）',
    pg_temp.allowed(format(
      'insert into public.meal_logs (user_id, image_path, tag) values (%L, ''meals/evil.jpg'', ''curry'')', b)),
    false);

  perform pg_temp.expect(
    'battle_results INSERT 本人名義でも拒否',
    pg_temp.allowed(format(
      'insert into public.battle_results (user_id, enemy_character_id, enemy_attribute) values (%L, ''curry-poop'', ''curry'')', a)),
    false);
  perform pg_temp.expect(
    'battle_results INSERT completedでも拒否',
    pg_temp.allowed(format(
      'insert into public.battle_results (user_id, enemy_character_id, enemy_attribute, status) values (%L, ''curry-poop'', ''curry'', ''completed'')', a)),
    false);

  perform pg_temp.expect(
    'battle_results INSERT 他人名義（偽装）',
    pg_temp.allowed(format(
      'insert into public.battle_results (user_id, enemy_character_id, enemy_attribute) values (%L, ''curry-poop'', ''curry'')', b)),
    false);

  -- 他人の食事ログを参照するバトルは作れない。user_id が自分でも、
  -- meal_log_id が他人のものなら拒否される（他人の食事IDの存在確認を防ぐ）。
  -- ここで見たいのは所有者の突き合わせなので、status は completed にして
  -- active の一意制約と干渉させない（干渉させると、RLSが効いたのか
  -- 制約に当たったのか区別できなくなる）。
  perform pg_temp.expect(
    'battle_results INSERT 本人の食事を参照しても拒否',
    pg_temp.allowed(format(
      'insert into public.battle_results (user_id, meal_log_id, enemy_character_id, enemy_attribute, status) values (%L, %L, ''curry-poop'', ''curry'', ''completed'')', a, meal_a)),
    false);
  perform pg_temp.expect(
    'battle_results INSERT 他人の食事を参照',
    pg_temp.allowed(format(
      'insert into public.battle_results (user_id, meal_log_id, enemy_character_id, enemy_attribute, status) values (%L, %L, ''curry-poop'', ''curry'', ''completed'')', a, meal_b)),
    false);
  perform pg_temp.expect(
    'battle_results UPDATE で他人の食事へ付け替え',
    pg_temp.allowed(format(
      'update public.battle_results set meal_log_id = %L where id = %L', meal_b, battle_a)),
    false);

  -- bowel_logs / user_characters はクライアントからのINSERTを一切許さない
  perform pg_temp.expect(
    'bowel_logs INSERT 本人名義でも拒否',
    pg_temp.allowed(format(
      'insert into public.bowel_logs (user_id, battle_result_id, hardness, amount, color, ease) values (%L, gen_random_uuid(), 4, ''normal'', ''brown'', ''easy'')', a)),
    false);
  perform pg_temp.expect(
    'user_characters INSERT 本人名義でも拒否',
    pg_temp.allowed(format(
      'insert into public.user_characters (user_id, character_id) values (%L, ''curry-poop'')', a)),
    false);

  -- UPDATE: 食事ログだけがクライアントから更新できる --------------------------
  perform pg_temp.expect(
    'meal_logs UPDATE 本人',
    pg_temp.allowed(format('update public.meal_logs set note = ''ok'' where id = %L', meal_a)),
    true);
  perform pg_temp.expect(
    'meal_logs UPDATE 他人',
    pg_temp.allowed(format('update public.meal_logs set note = ''evil'' where id = %L', meal_b)),
    false);

  -- WITH CHECK の検査。USING だけのポリシーだと、本人の行の user_id を
  -- 他人のIDへ書き換えて行ごと渡せてしまう。ここが拒否になることが重要。
  perform pg_temp.expect(
    'meal_logs UPDATE で user_id を他人へ書換え',
    pg_temp.allowed(format('update public.meal_logs set user_id = %L where id = %L', b, meal_a)),
    false);

  perform pg_temp.expect(
    'battle_results UPDATE 本人でも拒否',
    pg_temp.allowed(format('update public.battle_results set status = ''won'' where id = %L', battle_a)),
    false);
  perform pg_temp.expect(
    'battle_results UPDATE 他人',
    pg_temp.allowed(format('update public.battle_results set status = ''won'' where id = %L', battle_b)),
    false);
  perform pg_temp.expect(
    'battle_results UPDATE で user_id を他人へ書換え',
    pg_temp.allowed(format('update public.battle_results set user_id = %L where id = %L', b, battle_a)),
    false);

  perform pg_temp.expect(
    'bowel_logs UPDATE 本人でも拒否',
    pg_temp.allowed(format('update public.bowel_logs set hardness = 1 where user_id = %L', a)),
    false);
  perform pg_temp.expect(
    'user_characters UPDATE 本人でも拒否',
    pg_temp.allowed(format('update public.user_characters set character_id = ''golden-poop'' where user_id = %L', a)),
    false);

  -- DELETE: 食事ログは本人だけが削除できる ----------------------------------
  perform pg_temp.expect(
    'meal_logs DELETE 本人',
    pg_temp.allowed(format('delete from public.meal_logs where id = %L', meal_a)),
    true);
  perform pg_temp.expect(
    'meal_logs DELETE 他人',
    pg_temp.allowed(format('delete from public.meal_logs where id = %L', meal_b)),
    false);
  perform pg_temp.expect(
    'battle_results DELETE 他人',
    pg_temp.allowed(format('delete from public.battle_results where id = %L', battle_b)),
    false);
  perform pg_temp.expect(
    'bowel_logs DELETE 他人',
    pg_temp.allowed(format('delete from public.bowel_logs where user_id = %L', b)),
    false);
  perform pg_temp.expect(
    'user_characters DELETE 他人',
    pg_temp.allowed(format('delete from public.user_characters where user_id = %L', b)),
    false);

  -- profiles: 本人だけ見え、書き込みは一切できない -------------------------
  perform pg_temp.expect(
    'profiles SELECT 本人',
    pg_temp.allowed(format('select 1 from public.profiles where id = %L', a)),
    true);
  perform pg_temp.expect(
    'profiles SELECT 他人',
    pg_temp.allowed(format('select 1 from public.profiles where id = %L', b)),
    false);

  -- characters: マスターは全員が読めて、誰も書けない ------------------------
  perform pg_temp.expect(
    'characters SELECT',
    pg_temp.allowed('select 1 from public.characters limit 1'),
    true);
  perform pg_temp.expect(
    'characters UPDATE 拒否',
    pg_temp.allowed('update public.characters set name = ''evil'' where id = ''curry-poop'''),
    false);

  reset role;
end;
$$;

-- ---------------------------------------------------------------------------
-- ユーザーBからも同じく他人（A）の行が見えないことを確認する。
-- ポリシーが「特定のユーザーだけ通る」形になっていないことの裏取り。
-- ---------------------------------------------------------------------------
do $$
declare
  a uuid := pg_temp.fixture('user_a');
  b uuid := pg_temp.fixture('user_b');
begin
  perform pg_temp.become(b);

  perform pg_temp.expect(
    'B視点: meal_logs は自分の行だけ',
    (select count(*) = 0 from public.meal_logs where user_id = a),
    true);
  perform pg_temp.expect(
    'B視点: battle_results は自分の行だけ',
    (select count(*) = 0 from public.battle_results where user_id = a),
    true);
  perform pg_temp.expect(
    'B視点: bowel_logs は自分の行だけ',
    (select count(*) = 0 from public.bowel_logs where user_id = a),
    true);
  perform pg_temp.expect(
    'B視点: user_characters は自分の行だけ',
    (select count(*) = 0 from public.user_characters where user_id = a),
    true);

  reset role;
end;
$$;

-- ---------------------------------------------------------------------------
-- テーブル権限（RLSの手前）にも公開ロールの余計な権限が残っていないこと
-- ---------------------------------------------------------------------------
do $$
declare
  leftover text;
begin
  -- 直接付与された権限（information_schema.role_table_grants）ではなく、
  -- has_table_privilege で実効権限を見る。role_table_grants は PUBLIC への
  -- grant や他ロール経由で継承した権限を grantee='anon' の行として返さないため、
  -- 実際にはアクセスできるのに「権限なし」と表示されてしまう。
  --
  -- 期待する権限の一覧と実効権限を突き合わせ、差分があれば落とす。
  -- 「余計な権限がある」だけでなく「必要な権限が消えている」も検出する。
  select string_agg(format('%s/%s/%s', r.role, t.tbl, p.priv), ', ' order by r.role, t.tbl, p.priv)
  into leftover
  from (values ('anon'), ('authenticated')) as r(role)
  cross join (values
    ('profiles'), ('characters'), ('meal_logs'),
    ('battle_results'), ('bowel_logs'), ('user_characters')
  ) as t(tbl)
  -- CRUDだけでなく全テーブル権限を見る。TRUNCATE と MAINTAIN は行単位の権限では
  -- ないためRLSが効かず、CRUDだけを検査していると見落とす。
  cross join (values
    ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'),
    ('TRUNCATE'), ('REFERENCES'), ('TRIGGER'), ('MAINTAIN')
  ) as p(priv)
  where has_table_privilege(r.role, 'public.' || t.tbl, p.priv)
    <> ((r.role, t.tbl, p.priv) in (
      -- マスターは全員が読める。
      ('anon', 'characters', 'SELECT'),
      ('authenticated', 'characters', 'SELECT'),
      -- プロフィールは本人が読むだけ（作成はトリガー）。
      ('authenticated', 'profiles', 'SELECT'),
      -- 食事はクライアントが作成・更新する。バトルの確定はRPCだけが行う。
      ('authenticated', 'meal_logs', 'SELECT'),
      ('authenticated', 'meal_logs', 'INSERT'),
      ('authenticated', 'meal_logs', 'UPDATE'),
      ('authenticated', 'meal_logs', 'DELETE'),
      ('authenticated', 'battle_results', 'SELECT'),
      -- 排便ログと所有キャラクターは読み取り専用。
      ('authenticated', 'bowel_logs', 'SELECT'),
      ('authenticated', 'user_characters', 'SELECT')
    ));

  if leftover is not null then
    raise exception 'FAIL: テーブル権限が設計と違う（過不足）— %', leftover;
  end if;
  raise notice 'ok: anon / authenticated の実効テーブル権限は設計どおり';
end;
$$;

-- ---------------------------------------------------------------------------
-- TRUNCATE が公開ロールから剥がれていること
-- ---------------------------------------------------------------------------
-- TRUNCATE は行単位の権限ではないためRLSが一切効かない。権限が残っていると
-- 匿名ユーザー1人で全ユーザーの行を消せる（FKのcascadeで他テーブルにも波及する）。
--
-- この検査は pg_temp.allowed() を通さない。allowed() は row_count で判定するが、
-- TRUNCATE は成功しても常に0行を報告するため、成功を「拒否」と誤判定してしまう。
do $$
declare
  leftover text;
begin
  select string_agg(format('%s/%s', r.role, t.tbl), ', ' order by r.role, t.tbl)
  into leftover
  from (values ('anon'), ('authenticated')) as r(role)
  cross join (values
    ('profiles'), ('characters'), ('meal_logs'),
    ('battle_results'), ('bowel_logs'), ('user_characters')
  ) as t(tbl)
  where has_table_privilege(r.role, 'public.' || t.tbl, 'TRUNCATE');

  if leftover is not null then
    raise exception 'FAIL: TRUNCATE権限が残っている（RLSが効かない）— %', leftover;
  end if;
  raise notice 'ok: 公開ロールに TRUNCATE 権限が無い';
end;
$$;

-- 検証用データはコミットしない。
rollback;
