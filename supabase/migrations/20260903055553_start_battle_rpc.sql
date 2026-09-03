-- バトル開始も敵選定からサーバー側で完結する。authenticated が直接INSERT
-- できると任意の enemy_character_id を指定して仲間化対象を選べてしまうため、
-- 作成経路を start_battle RPC に限定する。
drop policy "battle_results_insert_own" on public.battle_results;
revoke insert on public.battle_results from authenticated;

create or replace function private.start_battle()
returns table (
  battle_id uuid,
  enemy_character_id text,
  enemy_attribute public.character_attribute,
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
begin
  if v_user_id is null then
    raise exception 'authentication is required' using errcode = '28000';
  end if;

  -- active行が無い場合も同一ユーザーの開始を直列化する。部分ユニーク索引だけに
  -- 任せると、同時開始の片方が一意制約エラーになって再開結果を返せない。
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select *
  into v_battle
  from public.battle_results
  where user_id = v_user_id
    and status = 'active'
  for update;

  if found then
    return query
    select v_battle.id, v_battle.enemy_character_id, v_battle.enemy_attribute, true;
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

  -- 属性一致の候補が空なら、seed済みの normal を最終フォールバックにする。
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

  insert into public.battle_results (
    user_id,
    enemy_character_id,
    enemy_attribute,
    meal_log_id,
    status
  ) values (
    v_user_id,
    v_enemy.id,
    v_enemy.attribute,
    null,
    'active'
  )
  returning * into v_battle;

  return query
  select v_battle.id, v_battle.enemy_character_id, v_battle.enemy_attribute, false;
end;
$$;

create or replace function public.start_battle()
returns table (
  battle_id uuid,
  enemy_character_id text,
  enemy_attribute public.character_attribute,
  resumed boolean
)
language sql
security invoker
set search_path = ''
as $$
  select * from private.start_battle();
$$;

revoke all on function private.start_battle() from public, anon, authenticated;
revoke all on function public.start_battle() from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.start_battle() to authenticated;
grant execute on function public.start_battle() to authenticated;
