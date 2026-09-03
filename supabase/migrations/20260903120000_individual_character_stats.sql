-- 個体ごとの HP / Power / Speed を user_characters に持たせる（Issue #73）。
--
-- ステータスは種族（characters）ではなく個体に付く。同じ character_id でも、
-- ユーザーが違えば・取得タイミングが違えば別の値になりうる。
--
-- 育成は行わない。3値は仲間化した瞬間に乱数で確定し、以後変わらない。
-- 強い個体は「育てる」のではなく「引き直して当てる」（ハクスラの方針）。
--
-- クライアントは値を一切指定できない。初期値は仲間化時に definer RPC だけが
-- 振る。UPDATE ポリシーも UPDATE 権限も足さないため、PostgREST 経由の
-- 直接更新は権限レベルで届かない。

-- ---------------------------------------------------------------------------
-- user_characters に3列を足す
-- ---------------------------------------------------------------------------
alter table public.user_characters
  add column hp integer not null default 240 check (hp > 0),
  add column power integer not null default 20 check (power > 0),
  add column speed integer not null default 20 check (speed > 0);

comment on column public.user_characters.hp is
  '個体の最大HP。バトル開幕のHPになる。仲間化時に振り、以後変わらない。';
comment on column public.user_characters.power is
  '個体の通常攻撃の基礎ダメージ。タイプ補正とガードはこの値に掛かる。';
comment on column public.user_characters.speed is
  '個体の攻撃間隔。値が大きいほど通常攻撃の待ちティックが短くなる。';

-- 既存行は基準値（default）で埋まる。以降の行は RPC が明示的に値を入れるため、
-- default を残す必要はない。「入れ忘れたら黙って基準値」を防ぐ。
alter table public.user_characters
  alter column hp drop default,
  alter column power drop default,
  alter column speed drop default;

-- ---------------------------------------------------------------------------
-- battle_results にパーティ・敵のステータススナップショットを持たせる
-- ---------------------------------------------------------------------------
-- バトル開始時点の値を固定する。完了時に「誰が出ていたか」をサーバーが知らないと、
-- 成長させる個体をクライアントに教えてもらうことになり、他人の個体や
-- レンタルを指定されうる。開始時に確定させて、完了時はそれだけを読む。
alter table public.battle_results
  add column party_snapshot jsonb not null default '[]'::jsonb,
  add column enemy_hp integer not null default 480 check (enemy_hp > 0),
  add column enemy_power integer not null default 20 check (enemy_power > 0),
  add column enemy_speed integer not null default 20 check (enemy_speed > 0);

comment on column public.battle_results.party_snapshot is
  '開始時のパーティ。要素は {user_character_id, character_id, attribute, hp, power, speed}。'
  ' user_character_id が null ならレンタル（所有行が無く、成長もしない）。';
comment on column public.battle_results.enemy_hp is
  '開始時にサーバーが決めた敵のHP。マスターには列を作らず、バトルごとに固定する。';

-- ---------------------------------------------------------------------------
-- start_battle: 選出する所持個体を受け取り、ステータスを確定して返す
-- ---------------------------------------------------------------------------
-- 戻り値の列が増えるため、CREATE OR REPLACE では置き換えられない。
-- 権限は関数と一緒に消えるので、作り直したあとに付け直す。
drop function if exists public.start_battle();
drop function if exists private.start_battle();

create function private.start_battle(p_user_character_ids uuid[])
returns table (
  battle_id uuid,
  enemy_character_id text,
  enemy_attribute public.character_attribute,
  enemy_hp integer,
  enemy_power integer,
  enemy_speed integer,
  party_snapshot jsonb,
  resumed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_battle public.battle_results%rowtype;
  v_attribute public.character_attribute;
  v_enemy public.characters%rowtype;
  v_party jsonb;
  v_enemy_hp integer;
  v_enemy_power integer;
  v_enemy_speed integer;
  -- 個体値の基準と振れ幅。ドキュメントとテストで再現できるよう定数に置く。
  base_hp constant integer := 240;
  base_power constant integer := 20;
  base_speed constant integer := 20;
begin
  if v_user_id is null then
    raise exception 'authentication is required' using errcode = '28000';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select *
  into v_battle
  from public.battle_results
  where user_id = v_user_id
    and status = 'active'
  for update;

  if found then
    -- 再開では p_user_character_ids を一切見ない。見てしまうと、劣勢になった
    -- ところで開始を呼び直して無傷の個体へ差し替えられる。
    return query
    select
      v_battle.id,
      v_battle.enemy_character_id,
      v_battle.enemy_attribute,
      v_battle.enemy_hp,
      v_battle.enemy_power,
      v_battle.enemy_speed,
      v_battle.party_snapshot,
      true;
    return;
  end if;

  v_attribute := (
    array[
      'curry'::public.character_attribute,
      'vegetable'::public.character_attribute,
      'spicy'::public.character_attribute,
      'meat'::public.character_attribute,
      'sweet'::public.character_attribute,
      'dairy'::public.character_attribute,
      'normal'::public.character_attribute
    ]
  )[floor(random() * 7)::integer + 1];

  select *
  into v_enemy
  from public.characters
  where attribute = v_attribute
  order by random()
  limit 1;

  if not found then
    select *
    into v_enemy
    from public.characters
    where attribute = 'normal'::public.character_attribute
    order by random()
    limit 1;
  end if;

  if not found then
    raise exception 'no enemy character is available' using errcode = 'P0001';
  end if;

  -- 敵のステータスもバトルごとにサーバーが振る。マスターの列にはしない。
  v_enemy_hp := 480 + floor(random() * 121)::integer - 60;
  v_enemy_power := base_power + floor(random() * 9)::integer - 4;
  v_enemy_speed := base_speed + floor(random() * 9)::integer - 4;

  -- 選出は「本人の所持個体」だけを採る。他人の行や存在しないIDは、
  -- エラーにせず単に落とす（存在の有無をIDから読み取らせない）。
  -- 順序は渡された配列の並びを保つ。
  --
  -- 同じIDが複数回渡されたら、最初の1回だけを採る。unnest は重複を
  -- そのまま返すため、素通しにすると1体の高ステータス個体で3枠すべてを
  -- 埋められる。3体分の耐久を1体の数値で得られてしまうので潰す。
  --
  -- 上限3体への絞り込みは重複を除いた「後」に行う。先に位置で切ると、
  -- 重複を混ぜられたぶんだけ実際の選出数が減る。
  with picked as (
    select distinct on (uc.id)
      uc.id as user_character_id,
      uc.character_id,
      uc.hp,
      uc.power,
      uc.speed,
      c.attribute,
      c.name,
      ids.ord
    from unnest(p_user_character_ids) with ordinality as ids(id, ord)
    join public.user_characters as uc
      on uc.id = ids.id
     and uc.user_id = v_user_id
    join public.characters as c
      on c.id = uc.character_id
    order by uc.id, ids.ord
  ),
  party as (
    select *
    from picked
    order by ord
    limit 3
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'user_character_id', party.user_character_id,
        'character_id', party.character_id,
        'attribute', party.attribute,
        'name', party.name,
        'hp', party.hp,
        'power', party.power,
        'speed', party.speed
      )
      order by party.ord
    ),
    '[]'::jsonb
  )
  into v_party
  from party;

  insert into public.battle_results (
    user_id,
    enemy_character_id,
    enemy_attribute,
    meal_log_id,
    status,
    party_snapshot,
    enemy_hp,
    enemy_power,
    enemy_speed
  ) values (
    v_user_id,
    v_enemy.id,
    v_enemy.attribute,
    null,
    'active',
    v_party,
    v_enemy_hp,
    v_enemy_power,
    v_enemy_speed
  )
  returning * into v_battle;

  return query
  select
    v_battle.id,
    v_battle.enemy_character_id,
    v_battle.enemy_attribute,
    v_battle.enemy_hp,
    v_battle.enemy_power,
    v_battle.enemy_speed,
    v_battle.party_snapshot,
    false;
end;
$$;

create function public.start_battle(p_user_character_ids uuid[] default '{}'::uuid[])
returns table (
  battle_id uuid,
  enemy_character_id text,
  enemy_attribute public.character_attribute,
  enemy_hp integer,
  enemy_power integer,
  enemy_speed integer,
  party_snapshot jsonb,
  resumed boolean
)
language sql
security invoker
set search_path = ''
as $$
  select * from private.start_battle(p_user_character_ids);
$$;

revoke all on function private.start_battle(uuid[]) from public, anon, authenticated;
revoke all on function public.start_battle(uuid[]) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.start_battle(uuid[]) to authenticated;
grant execute on function public.start_battle(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- complete_battle: 仲間化時に初期3値を振る（成長はしない）
-- ---------------------------------------------------------------------------
-- 戻り値は変えないが、内部関数の本体を差し替える。public 側は据え置き。
create or replace function private.complete_battle(
  p_battle_id uuid,
  p_hardness smallint,
  p_amount text,
  p_color text,
  p_ease text,
  p_meal_log_id uuid
)
returns table (
  battle_id uuid,
  status public.battle_status,
  companionship_result boolean,
  character_id text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_battle public.battle_results%rowtype;
  v_companionship_result boolean := false;
  v_character_id text := null;
  v_rarity public.character_rarity;
  v_spread integer;
  v_base_hp integer;
  v_base_power integer;
  v_base_speed integer;
  companionship_chance constant double precision := 0.25;
begin
  if v_user_id is null then
    raise exception 'authentication is required' using errcode = '28000';
  end if;

  select *
  into v_battle
  from public.battle_results
  where id = p_battle_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'battle cannot be completed' using errcode = '42501';
  end if;

  -- 既に確定済みなら、入力値や乱数を再評価せず同じ結果を返す。
  -- 初期値の抽選もここより後ろにしかないため、2回目の呼び出しで振り直さない。
  if v_battle.status <> 'active' then
    select uc.character_id
    into v_character_id
    from public.user_characters as uc
    where uc.acquired_from_battle_id = v_battle.id;

    return query
    select v_battle.id, v_battle.status, coalesce(v_battle.companionship_result, false), v_character_id;
    return;
  end if;

  if p_hardness is null
    or p_hardness not between 1 and 7
    or p_amount is null
    or p_amount not in ('small', 'normal', 'large')
    or p_color is null
    or p_color not in ('brown', 'dark_brown', 'yellow', 'green')
    or p_ease is null
    or p_ease not in ('easy', 'normal', 'hard') then
    raise exception 'invalid bowel log values' using errcode = '22023';
  end if;

  if p_meal_log_id is not null then
    if not exists (
      select 1
      from public.meal_logs as m
      where m.id = p_meal_log_id
        and m.user_id = v_user_id
    ) then
      raise exception 'meal log cannot be used' using errcode = '42501';
    end if;

    if v_battle.meal_log_id is not null and v_battle.meal_log_id <> p_meal_log_id then
      raise exception 'meal log cannot be changed' using errcode = '22023';
    end if;

    update public.battle_results
    set meal_log_id = p_meal_log_id
    where id = v_battle.id;
    v_battle.meal_log_id := p_meal_log_id;
  end if;

  if v_battle.meal_log_id is not null then
    v_companionship_result := random() < companionship_chance;
  end if;

  insert into public.bowel_logs (
    user_id,
    battle_result_id,
    hardness,
    amount,
    color,
    ease
  ) values (
    v_user_id,
    v_battle.id,
    p_hardness,
    p_amount,
    p_color,
    p_ease
  );

  update public.battle_results
  set
    status = 'completed',
    companionship_result = v_companionship_result,
    completed_at = now()
  where id = v_battle.id;

  if v_companionship_result then
    select c.rarity
    into v_rarity
    from public.characters as c
    where c.id = v_battle.enemy_character_id;

    -- レアリティは基準値と振れ幅の両方を上げる。高レアほど地力が高く、
    -- かつ当たり外れも大きい。同レアの中で強い個体を狙って引き直す。
    v_base_power := case v_rarity
      when 'common' then 20
      when 'rare' then 26
      when 'epic' then 32
      when 'legendary' then 38
      else 20
    end;
    v_base_speed := v_base_power;
    -- HP は他の2値の12倍の桁で扱う（240 : 20）。基準もその比で揃える。
    v_base_hp := v_base_power * 12;

    v_spread := case v_rarity
      when 'common' then 4
      when 'rare' then 6
      when 'epic' then 8
      when 'legendary' then 10
      else 4
    end;

    insert into public.user_characters as uc (
      user_id,
      character_id,
      acquired_from_battle_id,
      hp,
      power,
      speed
    ) values (
      v_user_id,
      v_battle.enemy_character_id,
      v_battle.id,
      -- HP は振れ幅も12倍にして、他の2値と体感の重みを揃える。
      -- 3値は独立に振る。HPだけ高い個体・Speedだけ高い個体が出る。
      greatest(1, v_base_hp + (floor(random() * (v_spread * 24 + 1))::integer - v_spread * 12)),
      greatest(1, v_base_power + (floor(random() * (v_spread * 2 + 1))::integer - v_spread)),
      greatest(1, v_base_speed + (floor(random() * (v_spread * 2 + 1))::integer - v_spread))
    )
    returning uc.character_id into v_character_id;
  end if;

  -- 育成は行わない。個体の3値は仲間化した瞬間に確定し、以後変わらない。
  -- 強い個体は「育てる」のではなく「引き直して当てる」もの（ハクスラの方針）。

  return query
  select v_battle.id, 'completed'::public.battle_status, v_companionship_result, v_character_id;
end;
$$;
