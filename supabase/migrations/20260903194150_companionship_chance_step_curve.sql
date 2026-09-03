-- 線形 50%/100% 版が既に当たっているローカルDB向け。関数本体は直前の migration と同じ。
-- 仲間化抽選は 1件 50%、2件 75%、3件 85%、4件以降 90%。0件は抽選しない。

drop function if exists private.companionship_chance(integer);

create function private.companionship_chance(p_meal_log_count integer)
returns double precision
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when coalesce(p_meal_log_count, 0) <= 0 then 0.0::double precision
    when p_meal_log_count = 1 then 0.5::double precision
    when p_meal_log_count = 2 then 0.75::double precision
    when p_meal_log_count = 3 then 0.85::double precision
    else 0.9::double precision
  end;
$$;

revoke all on function private.companionship_chance(integer) from public, anon, authenticated;
