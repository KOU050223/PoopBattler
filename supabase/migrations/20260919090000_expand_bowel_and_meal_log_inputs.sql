-- プレミアムレポート用の追加入力。既存ログはデフォルト値でそのまま読めるようにする。

alter table public.bowel_logs
  add column if not exists symptoms text[] not null default '{}'::text[];

alter table public.bowel_logs
  drop constraint if exists bowel_logs_color_check;

alter table public.bowel_logs
  add constraint bowel_logs_color_check
    check (color in ('brown', 'dark_brown', 'yellow', 'green', 'red', 'black', 'white_gray', 'other'));

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bowel_logs_symptoms_allowed'
      and conrelid = 'public.bowel_logs'::regclass
  ) then
    alter table public.bowel_logs
      add constraint bowel_logs_symptoms_allowed
      check (
        cardinality(symptoms) between 0 and 4
        and array_position(symptoms, null) is null
        and symptoms <@ array[
          'strained',
          'incomplete_evacuation',
          'abdominal_pain',
          'urgent_urge'
        ]::text[]
        and public.has_unique_text_array_elements(symptoms)
      );
  end if;
end $$;

alter table public.meal_logs
  drop constraint if exists meal_logs_food_groups_allowed;

alter table public.meal_logs
  add constraint meal_logs_food_groups_allowed
    check (
      food_groups <@ array[
        'rice', 'bread', 'noodles', 'potatoes', 'whole_grains',
        'meat', 'fish', 'eggs', 'soy_products', 'legumes',
        'green_yellow_vegetables', 'light_colored_vegetables', 'mushrooms', 'seaweed',
        'milk', 'yogurt', 'cheese', 'fermented_foods',
        'fruit', 'sweets', 'sugary_drinks',
        'fried_food', 'fatty_food', 'spicy_food', 'alcohol', 'caffeine', 'other'
      ]::text[]
    );

comment on column public.bowel_logs.symptoms is
  '任意の排便時症状。許可済みIDだけの重複なし配列で、未入力は空配列。医学的診断には用いない。';

-- 新しい7引数版を内部実装にする。旧6引数のpublic関数は下で空配列を渡す互換窓口として残す。
drop function if exists private.complete_battle(uuid, smallint, text, text, text, uuid, text[]);
drop function if exists public.complete_battle(uuid, smallint, text, text, text, uuid, text[]);
drop function if exists public.complete_battle_with_symptoms(uuid, smallint, text, text, text, uuid, text[]);

create function private.complete_battle(
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
    select uc.character_id into v_character_id
    from public.user_characters as uc
    where uc.acquired_from_battle_id = v_battle.id;

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

create function public.complete_battle_with_symptoms(
  p_battle_id uuid,
  p_hardness smallint,
  p_amount text,
  p_color text,
  p_ease text,
  p_meal_log_id uuid default null,
  p_symptoms text[] default '{}'::text[]
)
returns table (battle_id uuid, status public.battle_status, companionship_result boolean, character_id text)
language sql security invoker set search_path = ''
as $$
  select * from private.complete_battle(p_battle_id, p_hardness, p_amount, p_color, p_ease, p_meal_log_id, p_symptoms);
$$;

-- ロールアウト中の旧クライアントは従来の6引数で呼ぶ。症状なしとして安全に保存する。
create or replace function public.complete_battle(
  p_battle_id uuid,
  p_hardness smallint,
  p_amount text,
  p_color text,
  p_ease text,
  p_meal_log_id uuid default null
)
returns table (battle_id uuid, status public.battle_status, companionship_result boolean, character_id text)
language sql security invoker set search_path = ''
as $$
  select * from private.complete_battle(p_battle_id, p_hardness, p_amount, p_color, p_ease, p_meal_log_id, '{}'::text[]);
$$;

revoke all on function private.complete_battle(uuid, smallint, text, text, text, uuid, text[]) from public, anon, authenticated;
revoke all on function public.complete_battle_with_symptoms(uuid, smallint, text, text, text, uuid, text[]) from public, anon, authenticated;
grant execute on function private.complete_battle(uuid, smallint, text, text, text, uuid, text[]) to authenticated;
grant execute on function public.complete_battle_with_symptoms(uuid, smallint, text, text, text, uuid, text[]) to authenticated;
