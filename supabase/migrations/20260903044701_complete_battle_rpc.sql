-- バトル完了は、排便ログ・結果・仲間化を同時に確定する唯一の書き込み経路にする。
-- authenticated が battle_results を直接更新できると、status や抽選結果だけを
-- 任意に変更でき、原子的な確定という前提が崩れるため権限を外す。
drop policy "battle_results_update_own" on public.battle_results;
revoke update on public.battle_results from authenticated;

-- PostgREST に公開する入口は SECURITY INVOKER のままにする。排便ログと
-- 所有キャラクターへの書き込みだけは、最小限の内部 SECURITY DEFINER 関数へ
-- 委譲する。private スキーマは API の exposed schema ではない。
create schema if not exists private;
revoke all on schema private from public;

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
  companionship_chance constant double precision := 0.25;
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

  if p_meal_log_id is not null then
    -- client の user_id は一切受け取らず、ロックしたバトルの本人IDと照合する。
    if not exists (
      select 1
      from public.meal_logs as m
      where m.id = p_meal_log_id
        and m.user_id = v_user_id
    ) then
      raise exception 'meal log cannot be used' using errcode = '42501';
    end if;

    -- 一度選んだ食事を別の食事へ差し替えられないようにする。
    if v_battle.meal_log_id is not null and v_battle.meal_log_id <> p_meal_log_id then
      raise exception 'meal log cannot be changed' using errcode = '22023';
    end if;

    update public.battle_results
    set meal_log_id = p_meal_log_id
    where id = v_battle.id;
    v_battle.meal_log_id := p_meal_log_id;
  end if;

  -- 食事が選ばれたときだけ、サーバー側の固定確率で一度だけ抽選する。
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
  p_meal_log_id uuid default null
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
    p_meal_log_id
  );
$$;

revoke all on function private.complete_battle(uuid, smallint, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.complete_battle(uuid, smallint, text, text, text, uuid) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.complete_battle(uuid, smallint, text, text, text, uuid) to authenticated;
grant execute on function public.complete_battle(uuid, smallint, text, text, text, uuid) to authenticated;
