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
  ('meal_a', gen_random_uuid()),
  ('meal_b', gen_random_uuid()),
  ('battle_a', gen_random_uuid()),
  ('battle_b', gen_random_uuid());

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
where f.key in ('user_a', 'user_b');

-- トリガーが実際に発火したかを先に確認する。ここが通らないと、
-- 以降の「他人の行が見えない」は単に行が無いだけになってしまう。
do $$
begin
  if (select count(*) from public.profiles
      where id in (pg_temp.fixture('user_a'), pg_temp.fixture('user_b'))) <> 2 then
    raise exception 'FAIL: on_auth_user_created が profiles を作っていない';
  end if;
end;
$$;

insert into public.meal_logs (id, user_id, image_path, tag)
values
  (pg_temp.fixture('meal_a'), pg_temp.fixture('user_a'), 'meals/a.jpg', 'curry'),
  (pg_temp.fixture('meal_b'), pg_temp.fixture('user_b'), 'meals/b.jpg', 'meat');

insert into public.battle_results (id, user_id, meal_log_id, enemy_character_id, enemy_attribute)
values
  (pg_temp.fixture('battle_a'), pg_temp.fixture('user_a'), pg_temp.fixture('meal_a'), 'curry-poop', 'curry'),
  (pg_temp.fixture('battle_b'), pg_temp.fixture('user_b'), pg_temp.fixture('meal_b'), 'meat-poop', 'meat');

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

  -- INSERT: 本人名義は通り、他人名義（所有者IDの偽装）は落ちる ---------------
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
    'battle_results INSERT 他人名義（偽装）',
    pg_temp.allowed(format(
      'insert into public.battle_results (user_id, enemy_character_id, enemy_attribute) values (%L, ''curry-poop'', ''curry'')', b)),
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

  -- UPDATE: 本人の行は更新でき、他人の行は更新できない ----------------------
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
    'battle_results UPDATE 本人',
    pg_temp.allowed(format('update public.battle_results set status = ''won'' where id = %L', battle_a)),
    true);
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

  -- DELETE: 削除機能は無く、本人の行でも消せない ---------------------------
  perform pg_temp.expect(
    'meal_logs DELETE 本人でも拒否',
    pg_temp.allowed(format('delete from public.meal_logs where id = %L', meal_a)),
    false);
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
  -- anon は個人データのテーブルに一切権限を持たない。
  select string_agg(format('%s/%s/%s', table_name, grantee, privilege_type), ', ')
  into leftover
  from information_schema.role_table_grants
  where table_schema = 'public'
    and grantee = 'anon'
    and table_name in ('profiles', 'meal_logs', 'battle_results', 'bowel_logs', 'user_characters')
    and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE');

  if leftover is not null then
    raise exception 'FAIL: anon に権限が残っている — %', leftover;
  end if;
  raise notice 'ok: anon には個人データの権限が無い';

  -- authenticated には設計上必要な権限しか残さない。
  select string_agg(format('%s/%s', table_name, privilege_type), ', ')
  into leftover
  from information_schema.role_table_grants
  where table_schema = 'public'
    and grantee = 'authenticated'
    and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
    and (table_name, privilege_type) not in (
      ('profiles', 'SELECT'),
      ('characters', 'SELECT'),
      ('meal_logs', 'SELECT'), ('meal_logs', 'INSERT'), ('meal_logs', 'UPDATE'),
      ('battle_results', 'SELECT'), ('battle_results', 'INSERT'), ('battle_results', 'UPDATE'),
      ('bowel_logs', 'SELECT'),
      ('user_characters', 'SELECT')
    );

  if leftover is not null then
    raise exception 'FAIL: authenticated に想定外の権限がある — %', leftover;
  end if;
  raise notice 'ok: authenticated の権限は設計どおり';
end;
$$;

-- 検証用データはコミットしない。
rollback;
