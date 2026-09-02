-- MVPの確定データ（食事・バトル・排便・所有キャラクター）を保存するテーブルを定義する。
-- ポリシーは別Issueで作成するため、ここではRLSの有効化までを行う。

-- ---------------------------------------------------------------------------
-- meal_logs: 食事の記録
-- ---------------------------------------------------------------------------
-- 画像そのものは非公開Storageバケットに置き、ここにはパスだけを持つ。
create table public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  eaten_at timestamptz not null default now(),
  image_path text not null,
  tag text not null,
  note text,
  created_at timestamptz not null default now()
);

comment on table public.meal_logs is
  '食事の記録。image_path は非公開Storageバケット内のパスで、表示時に署名URLを発行する。';

comment on column public.meal_logs.tag is
  '食事の簡易タグ。敵属性の決定に使う。AI解析は行わず、登録時にユーザーが選ぶ。';

alter table public.meal_logs enable row level security;

-- ---------------------------------------------------------------------------
-- battle_results: 1回のバトル
-- ---------------------------------------------------------------------------
-- 進行中のバトルも active として1行作る。演出とダメージ計算はクライアントで行い、
-- 敵の決定と仲間化抽選はサーバー側で確定する。
create type public.battle_status as enum (
  'active',
  'won',
  'completed'
);

create table public.battle_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- 食事ログを消しても、そこから始まったバトルの記録は残す。
  meal_log_id uuid references public.meal_logs (id) on delete set null,
  enemy_character_id text not null references public.characters (id),
  enemy_attribute public.character_attribute not null,
  status public.battle_status not null default 'active',
  -- 仲間化抽選の結果。抽選前（active / won）は null。
  companionship_result boolean,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

comment on table public.battle_results is
  '1回のバトル。開始時に active で作成し、完了時に結果を確定する。';

comment on column public.battle_results.companionship_result is
  '仲間化抽選の結果。サーバー側で一度だけ抽選するため、未抽選のあいだは null。';

alter table public.battle_results enable row level security;

-- ---------------------------------------------------------------------------
-- bowel_logs: 排便の記録
-- ---------------------------------------------------------------------------
-- 選択式の入力なので、取りうる値をCHECK制約で限定する。
create table public.bowel_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- 1バトルにつき排便ログは最大1件。unique がその制約そのもの。
  battle_result_id uuid not null unique references public.battle_results (id) on delete cascade,
  -- 硬さは7段階（1=硬い 〜 7=ゆるい）。
  hardness smallint not null check (hardness between 1 and 7),
  amount text not null check (amount in ('small', 'normal', 'large')),
  color text not null check (color in ('brown', 'dark_brown', 'yellow', 'green')),
  ease text not null check (ease in ('easy', 'normal', 'hard')),
  logged_at timestamptz not null default now()
);

comment on table public.bowel_logs is
  '排便の記録。バトル1件につき最大1件で、医学的な判定には用いない。';

comment on column public.bowel_logs.hardness is
  '便の硬さ。1（硬い）から7（ゆるい）までの7段階。';

alter table public.bowel_logs enable row level security;

-- ---------------------------------------------------------------------------
-- user_characters: 所有キャラクター（図鑑）
-- ---------------------------------------------------------------------------
create table public.user_characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  character_id text not null references public.characters (id),
  -- 仲間化成功1回につき取得は最大1件。unique は NULL 同士を重複と見なさないため、
  -- バトル以外の経路（配布など）で増やす余地は残る。
  acquired_from_battle_id uuid unique references public.battle_results (id) on delete set null,
  acquired_at timestamptz not null default now()
);

comment on table public.user_characters is
  'ユーザーが所有するキャラクター。仲間化成功のたびに1件増える。';

alter table public.user_characters enable row level security;

-- ---------------------------------------------------------------------------
-- 一覧画面用のインデックス
-- ---------------------------------------------------------------------------
-- いずれも「本人の行を新しい順に並べる」クエリのため、user_id を先頭に置く。
create index meal_logs_user_id_eaten_at_idx
  on public.meal_logs (user_id, eaten_at desc);

create index battle_results_user_id_started_at_idx
  on public.battle_results (user_id, started_at desc);

-- 排便ログ一覧に加えて、user_id が先頭なのでアカウント削除時の
-- CASCADE（bowel_logs_user_id_fkey）の探索にもこの索引が効く。
create index bowel_logs_user_id_logged_at_idx
  on public.bowel_logs (user_id, logged_at desc);

create index user_characters_user_id_acquired_at_idx
  on public.user_characters (user_id, acquired_at desc);
