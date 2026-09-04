-- Server Action を経由しない書き込みでも、分析データの整合性を保つ。
create or replace function public.has_unique_text_array_elements(p_values text[])
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select cardinality(p_values) = (
    select count(distinct item)::integer
    from unnest(p_values) as item
  );
$$;

-- 既に重複がある古い行は、値を失わずに一意な配列へ正規化する。
update public.meal_logs
set food_groups = array(
  select distinct item
  from unnest(food_groups) as item
)
where not public.has_unique_text_array_elements(food_groups);

alter table public.meal_logs
  add constraint meal_logs_food_groups_unique
    check (public.has_unique_text_array_elements(food_groups)),
  add constraint meal_logs_note_length
    check (note is null or char_length(note) <= 500);
