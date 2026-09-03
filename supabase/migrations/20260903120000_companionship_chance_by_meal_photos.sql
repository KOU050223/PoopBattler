-- 仲間化確率は食事写真の枚数で上がる。計算式はクライアント表示と同じにする。
-- 1枚 25%、4枚で 100%。枚数の判定は本人の meal_logs だけを数える。

create or replace function private.companionship_chance(p_photo_count integer)
returns double precision
language sql
immutable
parallel safe
set search_path = ''
as $$
  select least(1.0::double precision, greatest(coalesce(p_photo_count, 0), 0) * 0.25::double precision);
$$;

revoke all on function private.companionship_chance(integer) from public, anon, authenticated;

drop function if exists public.complete_battle(uuid, smallint, text, text, text, uuid);
drop function if exists private.complete_battle(uuid, smallint, text, text, text, uuid);

create or replace function private.complete_battle(
  p_battle_id uuid,
  p_hardness smallint,
  p_amount text,
  p_color text,
  p_ease text,
  p_meal_log_id uuid,
  p_meal_log_ids uuid[]
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
  v_requested uuid[] := '{}'::uuid[];
  v_owned_count integer := 0;
  v_photo_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'authentication is required' using errcode = '28000';
  end if;

  -- 同じ battle_id の同時実行を直列化する。外部I/Oは行わず、ロック区間を短く保つ。
  select *
  into v_battle
  from public.battle_results
  where id = p_battle_id
    and user_id = v_user_id
  for update;

  if not found then
    -- 他人のIDか存在しないIDかを区別して返さない。
    raise exception 'battle cannot be completed' using errcode = '42501';
  end if;

  -- 既に確定済みなら、入力値や乱数を再評価せず同じ結果を返す。
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

  v_requested := coalesce(p_meal_log_ids, '{}'::uuid[]);
  if p_meal_log_id is not null then
    v_requested := p_meal_log_id || v_requested;
  end if;

  select coalesce(array_agg(id order by ord), '{}'::uuid[])
  into v_requested
  from (
    select t.id, min(t.ord) as ord
    from unnest(v_requested) with ordinality as t(id, ord)
    group by t.id
  ) as unique_ids;

  if cardinality(v_requested) > 4 then
    raise exception 'too many meal logs' using errcode = '22023';
  end if;

  if cardinality(v_requested) > 0 then
    select count(*)::integer
    into v_owned_count
    from public.meal_logs as m
    where m.id = any (v_requested)
      and m.user_id = v_user_id;

    if v_owned_count <> cardinality(v_requested) then
      raise exception 'meal log cannot be used' using errcode = '42501';
    end if;

    -- 一度選んだ食事を別の食事へ差し替えられないようにする。
    if v_battle.meal_log_id is not null and v_battle.meal_log_id <> v_requested[1] then
      raise exception 'meal log cannot be changed' using errcode = '22023';
    end if;

    update public.battle_results
    set meal_log_id = v_requested[1]
    where id = v_battle.id;
    v_battle.meal_log_id := v_requested[1];
  end if;

  v_photo_count := cardinality(v_requested);
  if v_photo_count > 0 then
    v_companionship_result := random() < private.companionship_chance(v_photo_count);
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
    insert into public.user_characters as uc (
      user_id,
      character_id,
      acquired_from_battle_id
    ) values (
      v_user_id,
      v_battle.enemy_character_id,
      v_battle.id
    )
    returning uc.character_id into v_character_id;
  end if;

  return query
  select v_battle.id, 'completed'::public.battle_status, v_companionship_result, v_character_id;
end;
$$;

create or replace function public.complete_battle(
  p_battle_id uuid,
  p_hardness smallint,
  p_amount text,
  p_color text,
  p_ease text,
  p_meal_log_id uuid default null,
  p_meal_log_ids uuid[] default '{}'::uuid[]
)
returns table (
  battle_id uuid,
  status public.battle_status,
  companionship_result boolean,
  character_id text
)
language sql
security invoker
set search_path = ''
as $$
  select *
  from private.complete_battle(
    p_battle_id,
    p_hardness,
    p_amount,
    p_color,
    p_ease,
    p_meal_log_id,
    p_meal_log_ids
  );
$$;

revoke all on function private.complete_battle(uuid, smallint, text, text, text, uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.complete_battle(uuid, smallint, text, text, text, uuid, uuid[]) from public, anon, authenticated;
grant execute on function private.complete_battle(uuid, smallint, text, text, text, uuid, uuid[]) to authenticated;
grant execute on function public.complete_battle(uuid, smallint, text, text, text, uuid, uuid[]) to authenticated;
