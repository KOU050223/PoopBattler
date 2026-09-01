-- MVPデモ用のキャラクターマスター。
-- `supabase db reset` で毎回適用されるため、再実行しても同じ状態になるようにする。
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
