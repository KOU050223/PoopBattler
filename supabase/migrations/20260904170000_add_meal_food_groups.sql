-- 食事分析用の分類は、ゲーム属性とは分離して複数選択で保持する。
-- 先行して migration history だけが進んだ環境も修復できるよう冪等にする。
alter table public.meal_logs
  add column if not exists food_groups text[];

-- 既存の単一タグは失わず、もっとも近い食品群へ一度だけ移行する。
update public.meal_logs
set food_groups = case tag
  when 'curry' then array['rice']
  when 'vegetable' then array['light_colored_vegetables']
  when 'banana' then array['fruit']
  when 'dairy' then array['yogurt']
  when 'spicy' then array['spicy_food']
  else array['other']
end
where food_groups is null;

alter table public.meal_logs
  alter column food_groups set not null,
  alter column tag drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'meal_logs_food_groups_not_empty'
      and conrelid = 'public.meal_logs'::regclass
  ) then
    alter table public.meal_logs
      add constraint meal_logs_food_groups_not_empty
      check (cardinality(food_groups) between 1 and 24 and array_position(food_groups, null) is null);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'meal_logs_food_groups_allowed'
      and conrelid = 'public.meal_logs'::regclass
  ) then
    alter table public.meal_logs
      add constraint meal_logs_food_groups_allowed
      check (
        food_groups <@ array[
          'rice', 'bread', 'noodles', 'potatoes',
          'meat', 'fish', 'eggs', 'soy_products',
          'green_yellow_vegetables', 'light_colored_vegetables', 'mushrooms', 'seaweed',
          'milk', 'yogurt', 'cheese', 'fermented_foods',
          'fruit', 'sweets', 'sugary_drinks',
          'fried_food', 'fatty_food', 'spicy_food', 'alcohol', 'other'
        ]::text[]
      );
  end if;
end $$;

comment on column public.meal_logs.food_groups is
  'ユーザーが選んだ食品群・栄養観点。ゲーム属性とは独立し、分析・頻度集計に使用する。';

comment on column public.meal_logs.tag is
  '旧MVPタグ。既存データの互換性のためだけに残し、新規記録では使用しない。';
