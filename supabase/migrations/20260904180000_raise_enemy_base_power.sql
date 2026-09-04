-- 敵の通常攻撃 Power を約 1.3 倍にする（Issue #139）。
--
-- 味方の AUTO_ATTACK_DAMAGE / レンタル / 所持個体の抽選は変えない。
-- 進行中バトルのスナップショットは触らない。新規開始分だけ新しい基準を使う。
-- 戻り値の形は変えないので CREATE OR REPLACE で本体だけ差し替える。

create or replace function private.start_battle(p_user_character_ids uuid[])
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
  -- 敵 Power は所持個体 common（20）の約 1.3 倍。振れ幅は ±4 のまま（Issue #139）。
  base_power constant integer := 26;
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
