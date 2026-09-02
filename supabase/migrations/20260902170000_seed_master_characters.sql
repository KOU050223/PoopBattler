-- キャラクターマスターをマイグレーションとして投入する。
--
-- seed.sql はローカルの `supabase db reset` でしか適用されず、`db push` では
-- 反映されない（supabase/README.md「リモートで別途必要な作業」）。
-- 一方 startBattleAction は characters が空だと敵を選べず、
-- 属性一致・フォールバックの双方が空振りしてエラーになる。
-- つまりこのデータはデモ用の飾りではなく、バトル成立の前提である。
-- README の方針どおり、恒久的に必要なマスターはマイグレーションで持つ。
--
-- seed.sql にも同じ内容を残してあるが、双方 `on conflict do update` なので
-- 二重に適用されても最終状態は変わらない。
insert into public.characters (id, name, attribute, rarity, image_key)
values
  ('curry-poop',     'カレーうんちくん',     'curry',     'common',    'characters/curry-poop.png'),
  ('vegetable-poop', '野菜うんちくん',       'vegetable', 'common',    'characters/vegetable-poop.png'),
  ('spicy-poop',     '激辛うんちくん',       'spicy',     'rare',      'characters/spicy-poop.png'),
  ('meat-poop',      '肉うんちくん',         'meat',      'common',    'characters/meat-poop.png'),
  ('banana-poop',    'バナナうんちくん',     'sweet',     'rare',      'characters/banana-poop.png'),
  ('yogurt-poop',    'ヨーグルトうんちくん', 'dairy',     'epic',      'characters/yogurt-poop.png'),
  ('normal-poop',    'ふつうのうんちくん',   'normal',    'common',    'characters/normal-poop.png'),
  ('golden-poop',    'ゴールデンうんちくん', 'normal',    'legendary', 'characters/golden-poop.png')
on conflict (id) do update
set
  name = excluded.name,
  attribute = excluded.attribute,
  rarity = excluded.rarity,
  image_key = excluded.image_key;
