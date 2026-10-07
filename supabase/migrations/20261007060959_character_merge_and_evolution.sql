-- うんちくんの合成（凸）と進化（★）を足す（Issue #196）。
--
-- これまでの「育成は無い。強い個体は引き直して当てる」方針を改め、
-- 「個体値（引きの当たり外れ）× 育成（凸と★）」の2軸にする。詳細は docs/merge.md。
--
-- 個体値（hp / power / speed）は今後も書き換えない。育成の度合いは
-- tier（★）と rank（凸）で別に持ち、実効値はバトル開始時にサーバーが掛け合わせる。
-- 個体値を直接書き換えないのは、成長カーブの調整をデータ移行なしで行うため。
--
-- クライアントは tier / rank を直接書けない。UPDATE / DELETE の権限もポリシーも
-- 足さず、変更は definer RPC（merge_characters / evolve_character）だけが行う。

-- ---------------------------------------------------------------------------
-- user_characters に★と凸を足す
-- ---------------------------------------------------------------------------
-- 個体値と違い、仲間化直後は必ず★1・0凸なので default 0 を残す。
alter table public.user_characters
  add column tier smallint not null default 0 check (tier between 0 and 2),
  add column rank smallint not null default 0 check (rank between 0 and 4);

comment on column public.user_characters.tier is
  '★の段階。0=★1、2=★3（最大）。4凸の個体を進化させると1上がり、rank は0に戻る。';
comment on column public.user_characters.rank is
  '現在の★での凸数（0〜4）。同じ種族の個体を素材に合成すると、レアリティごとの数だけ上がる。';

-- ---------------------------------------------------------------------------
-- 成長の定数（レアリティごと）
-- ---------------------------------------------------------------------------
-- TS 側の src/features/collection/character-growth.ts と同じ値を持つ。
-- どちらかだけ変えると、図鑑の表示とバトルの実数が黙ってずれる。

create function private.raise_unknown_rarity(p_rarity public.character_rarity)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
begin
  raise exception 'growth constants are not defined for rarity %', p_rarity using errcode = 'P0001';
end;
$$;

-- 進行度1段あたりの伸び率（%）。進行度 = tier * 4 + rank（0〜12）。
-- レアリティを足して case を更新し忘れると null が返り、実効値が黙って null になる。
-- else で落とすため plpgsql にする。
create function private.growth_percent_per_step(p_rarity public.character_rarity)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
begin
  return case p_rarity
    when 'common' then 5
    when 'rare' then 7
    when 'epic' then 8
    when 'legendary' then 10
    else private.raise_unknown_rarity(p_rarity)
  end;
end;
$$;

-- 合成1回で上がる凸数。高レアほど重複を引きにくいので、少ない素材で育つ。
create function private.merge_rank_gain(p_rarity public.character_rarity)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
begin
  return case p_rarity
    when 'common' then 1
    when 'rare' then 1
    when 'epic' then 2
    when 'legendary' then 4
    else private.raise_unknown_rarity(p_rarity)
  end;
end;
$$;

-- 実効値 = 個体値 × (100 + 伸び率 × 進行度) / 100 を四捨五入する。
-- 整数演算で丸めるのは、TS 側と浮動小数の誤差で1ずれないようにするため。
create function private.effective_stat(
  p_base integer,
  p_rarity public.character_rarity,
  p_tier smallint,
  p_rank smallint
)
returns integer
language sql
immutable
set search_path = ''
as $$
  select (
    p_base * (100 + private.growth_percent_per_step(p_rarity) * (p_tier * 4 + p_rank)) + 50
  ) / 100;
$$;

revoke all on function private.raise_unknown_rarity(public.character_rarity) from public, anon, authenticated;
revoke all on function private.growth_percent_per_step(public.character_rarity) from public, anon, authenticated;
revoke all on function private.merge_rank_gain(public.character_rarity) from public, anon, authenticated;
revoke all on function private.effective_stat(integer, public.character_rarity, smallint, smallint) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- start_battle: スナップショットに実効値を載せる
-- ---------------------------------------------------------------------------
-- 戻り値の形は変えないので CREATE OR REPLACE で本体だけ差し替える。
-- 変更点は picked で個体値の代わりに実効値を選ぶところだけ。
-- 進行中バトルのスナップショットは触らない（開始時点の値で戦い切る）。
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
  --
  -- 3値は★と凸を掛けた実効値を載せる（Issue #196）。バトル側は
  -- スナップショットの値をそのまま使うので、育成の計算はここだけで完結する。
  with picked as (
    select distinct on (uc.id)
      uc.id as user_character_id,
      uc.character_id,
      private.effective_stat(uc.hp, c.rarity, uc.tier, uc.rank) as hp,
      private.effective_stat(uc.power, c.rarity, uc.tier, uc.rank) as power,
      private.effective_stat(uc.speed, c.rarity, uc.tier, uc.rank) as speed,
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


-- ---------------------------------------------------------------------------
-- complete_battle: 冪等な再呼び出しが、合成で消えた個体に依存しないようにする
-- ---------------------------------------------------------------------------
-- 合成で user_characters の行が削除されうるようになったため、完了済みバトルの
-- 再呼び出しで「仲間化した個体の行」を探すのをやめる。変更は冒頭の分岐だけで、
-- 引数・戻り値は 20260919090000 と同じ（CREATE OR REPLACE で権限も保たれる）。
create or replace function private.complete_battle(
  p_battle_id uuid,
  p_hardness smallint,
  p_amount text,
  p_color text,
  p_ease text,
  p_meal_log_id uuid default null,
  p_symptoms text[] default '{}'::text[]
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
  v_meal_log_count integer := 0;
  v_rarity public.character_rarity;
  v_spread integer;
  v_base_hp integer;
  v_base_power integer;
  v_base_speed integer;
begin
  if v_user_id is null then
    raise exception 'authentication is required' using errcode = '28000';
  end if;

  select * into v_battle
  from public.battle_results
  where id = p_battle_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'battle cannot be completed' using errcode = '42501';
  end if;

  if v_battle.status <> 'active' then
    -- 仲間化した個体の行は引き直さない。合成の素材として消費されていると見つからず、
    -- character_id が null になる。クライアントは「仲間化したのに character_id が無い」
    -- を契約違反として扱うため、完了済みのバトルがエラーのまま抜け出せなくなる。
    -- 仲間化で作る行の character_id は常に enemy_character_id なので、それを返す。
    if coalesce(v_battle.companionship_result, false) then
      v_character_id := v_battle.enemy_character_id;
    end if;

    return query
    select v_battle.id, v_battle.status, coalesce(v_battle.companionship_result, false), v_character_id;
    return;
  end if;

  if p_hardness is null
    or p_hardness not between 1 and 7
    or p_amount is null or p_amount not in ('small', 'normal', 'large')
    or p_color is null or p_color not in ('brown', 'dark_brown', 'yellow', 'green', 'red', 'black', 'white_gray', 'other')
    or p_ease is null or p_ease not in ('easy', 'normal', 'hard')
    or p_symptoms is null
    or cardinality(p_symptoms) > 4
    or array_position(p_symptoms, null) is not null
    or not (p_symptoms <@ array['strained', 'incomplete_evacuation', 'abdominal_pain', 'urgent_urge']::text[])
    or not public.has_unique_text_array_elements(p_symptoms) then
    raise exception 'invalid bowel log values' using errcode = '22023';
  end if;

  if p_meal_log_id is not null then
    if not exists (
      select 1 from public.meal_logs as m
      where m.id = p_meal_log_id and m.user_id = v_user_id
    ) then
      raise exception 'meal log cannot be used' using errcode = '42501';
    end if;

    if v_battle.meal_log_id is not null and v_battle.meal_log_id <> p_meal_log_id then
      raise exception 'meal log cannot be changed' using errcode = '22023';
    end if;

    update public.battle_results set meal_log_id = p_meal_log_id where id = v_battle.id;
  end if;

  select count(*)::integer into v_meal_log_count
  from public.meal_logs where user_id = v_user_id;

  if v_meal_log_count > 0 then
    v_companionship_result := random() < private.companionship_chance(v_meal_log_count);
  end if;

  insert into public.bowel_logs (user_id, battle_result_id, hardness, amount, color, ease, symptoms)
  values (v_user_id, v_battle.id, p_hardness, p_amount, p_color, p_ease, p_symptoms);

  update public.battle_results
  set status = 'completed', companionship_result = v_companionship_result, completed_at = now()
  where id = v_battle.id;

  if v_companionship_result then
    select c.rarity into v_rarity from public.characters as c where c.id = v_battle.enemy_character_id;
    v_base_power := case v_rarity when 'common' then 20 when 'rare' then 26 when 'epic' then 32 when 'legendary' then 38 else 20 end;
    v_base_speed := v_base_power;
    v_base_hp := v_base_power * 12;
    v_spread := case v_rarity when 'common' then 4 when 'rare' then 6 when 'epic' then 8 when 'legendary' then 10 else 4 end;

    insert into public.user_characters as uc (user_id, character_id, acquired_from_battle_id, hp, power, speed)
    values (
      v_user_id, v_battle.enemy_character_id, v_battle.id,
      greatest(1, v_base_hp + (floor(random() * (v_spread * 24 + 1))::integer - v_spread * 12)),
      greatest(1, v_base_power + (floor(random() * (v_spread * 2 + 1))::integer - v_spread)),
      greatest(1, v_base_speed + (floor(random() * (v_spread * 2 + 1))::integer - v_spread))
    ) returning uc.character_id into v_character_id;
  end if;

  return query
  select v_battle.id, 'completed'::public.battle_status, v_companionship_result, v_character_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- merge_characters: 同じ種族の個体を素材にして、ベースの凸を上げる
-- ---------------------------------------------------------------------------
-- 素材の行は削除する。素材の★・凸・個体値は引き継がない（消える）。
--
-- 拒否の理由を UI が出し分けられるよう、独自の SQLSTATE を返す。
--   PBM01: 素材が育成済み（★2以上 or 1凸以上）で、確認フラグが無い
--   PBM02: 合成すると現在の★の凸上限（4）を超える
--   PBM03: どちらかが進行中バトルのパーティにいる
--   22023: 同じ個体同士・別の種族同士
--   42501: どちらかが本人の個体ではない（存在の有無は区別しない）
--
-- 育成済み素材の確認はUIだけに任せない。UIのバグで確認モーダルが出なかった
-- ときに、育てた個体が黙って消費されるのを防ぐ。
create function private.merge_characters(
  p_base_id uuid,
  p_material_id uuid,
  p_confirm_enhanced boolean
)
returns table (
  user_character_id uuid,
  tier smallint,
  rank smallint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_base public.user_characters%rowtype;
  v_material public.user_characters%rowtype;
  v_rarity public.character_rarity;
  v_next_rank integer;
  max_rank constant integer := 4;
begin
  if v_user_id is null then
    raise exception 'authentication is required' using errcode = '28000';
  end if;

  if p_base_id is null or p_material_id is null or p_base_id = p_material_id then
    raise exception 'base and material must be different characters' using errcode = '22023';
  end if;

  -- start_battle と同じキーで直列化する。合成中にバトルを開始されると、
  -- 消える素材がパーティに入ったまま始まりうる。
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select *
  into v_base
  from public.user_characters as uc
  where uc.id = p_base_id
    and uc.user_id = v_user_id
  for update;

  if not found then
    raise exception 'character cannot be merged' using errcode = '42501';
  end if;

  select *
  into v_material
  from public.user_characters as uc
  where uc.id = p_material_id
    and uc.user_id = v_user_id
  for update;

  if not found then
    raise exception 'character cannot be merged' using errcode = '42501';
  end if;

  if v_base.character_id <> v_material.character_id then
    raise exception 'only the same species can be merged' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.battle_results as b
    cross join lateral jsonb_array_elements(b.party_snapshot) as member
    where b.user_id = v_user_id
      and b.status = 'active'
      and member ->> 'user_character_id' in (p_base_id::text, p_material_id::text)
  ) then
    raise exception 'character is in an active battle' using errcode = 'PBM03';
  end if;

  if (v_material.tier > 0 or v_material.rank > 0)
    and not coalesce(p_confirm_enhanced, false) then
    raise exception 'material is enhanced; confirmation is required' using errcode = 'PBM01';
  end if;

  select c.rarity
  into v_rarity
  from public.characters as c
  where c.id = v_base.character_id;

  v_next_rank := v_base.rank + private.merge_rank_gain(v_rarity);

  -- 溢れた凸を黙って捨てない。4凸を超えるなら、進化してから合成し直してもらう。
  if v_next_rank > max_rank then
    raise exception 'rank would exceed the limit' using errcode = 'PBM02';
  end if;

  delete from public.user_characters as uc
  where uc.id = v_material.id;

  update public.user_characters as uc
  set rank = v_next_rank
  where uc.id = v_base.id;

  return query
  select v_base.id, v_base.tier, v_next_rank::smallint;
end;
$$;

-- ---------------------------------------------------------------------------
-- evolve_character: 4凸の個体を次の★へ上げる
-- ---------------------------------------------------------------------------
-- 進行度（tier * 4 + rank）は変わらないので、進化直後に実効値は下がらない。
-- 個体値は振り直さない。当たり個体は進化しても当たりのまま。
--   PBM04: 4凸に達していない、または既に★3
--   42501: 本人の個体ではない
create function private.evolve_character(p_user_character_id uuid)
returns table (
  user_character_id uuid,
  tier smallint,
  rank smallint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_row public.user_characters%rowtype;
  max_rank constant integer := 4;
  max_tier constant integer := 2;
begin
  if v_user_id is null then
    raise exception 'authentication is required' using errcode = '28000';
  end if;

  -- 単一行の更新だけなら行ロックで足りるが、育成操作はすべて start_battle /
  -- merge_characters と同じキーで直列化しておく。将来ここで複数行を触っても抜け道にならない。
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select *
  into v_row
  from public.user_characters as uc
  where uc.id = p_user_character_id
    and uc.user_id = v_user_id
  for update;

  if not found then
    raise exception 'character cannot be evolved' using errcode = '42501';
  end if;

  if v_row.rank < max_rank or v_row.tier >= max_tier then
    raise exception 'character is not ready to evolve' using errcode = 'PBM04';
  end if;

  update public.user_characters as uc
  set tier = v_row.tier + 1,
      rank = 0
  where uc.id = v_row.id;

  return query
  select v_row.id, (v_row.tier + 1)::smallint, 0::smallint;
end;
$$;

-- ---------------------------------------------------------------------------
-- 公開ラッパーと権限
-- ---------------------------------------------------------------------------
-- start_battle と同じく、PostgREST に出すのは invoker の public 関数だけにする。
create function public.merge_characters(
  p_base_id uuid,
  p_material_id uuid,
  p_confirm_enhanced boolean default false
)
returns table (
  user_character_id uuid,
  tier smallint,
  rank smallint
)
language sql
security invoker
set search_path = ''
as $$
  select * from private.merge_characters(p_base_id, p_material_id, p_confirm_enhanced);
$$;

create function public.evolve_character(p_user_character_id uuid)
returns table (
  user_character_id uuid,
  tier smallint,
  rank smallint
)
language sql
security invoker
set search_path = ''
as $$
  select * from private.evolve_character(p_user_character_id);
$$;

revoke all on function private.merge_characters(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.merge_characters(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function private.evolve_character(uuid) from public, anon, authenticated;
revoke all on function public.evolve_character(uuid) from public, anon, authenticated;

-- private の計算関数は definer の本体からしか呼ばないが、definer の所有者は
-- postgres なので authenticated への付与は不要。
grant execute on function private.merge_characters(uuid, uuid, boolean) to authenticated;
grant execute on function public.merge_characters(uuid, uuid, boolean) to authenticated;
grant execute on function private.evolve_character(uuid) to authenticated;
grant execute on function public.evolve_character(uuid) to authenticated;
