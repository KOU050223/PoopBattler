-- ユーザー所有データ（profiles）と、敵・図鑑の参照元（characters）を定義する。
-- profiles は匿名サインイン直後に auth.users のトリガーで自動作成する。

-- ---------------------------------------------------------------------------
-- profiles: auth.users と 1:1 のユーザープロフィール
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  '匿名サインインを含む全ユーザーのプロフィール。auth.users と 1:1 で対応する。';

alter table public.profiles enable row level security;

-- 本人のみ SELECT できる。INSERT / UPDATE / DELETE のポリシーは作らないため、
-- RLS 有効かつポリシー不在で全て拒否される（作成はトリガーのみが行う）。
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- auth.users への INSERT でプロフィールを自動作成するトリガー
-- ---------------------------------------------------------------------------
-- 挿入を行うのは supabase_auth_admin ロールで public スキーマの権限を持たないため、
-- security definer が必要。search_path は固定し、参照は全て schema 修飾する。
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'auth.users の INSERT 後に public.profiles を1件だけ作成するトリガー関数。';

-- 権限昇格する関数を API から直接呼べないようにする。
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- characters: 敵・図鑑のマスターデータ
-- ---------------------------------------------------------------------------
create table public.characters (
  id text primary key,
  name text not null,
  -- MVPの属性。食事タグから敵属性を決めるため、値を固定する。
  attribute text not null check (
    attribute in ('curry', 'vegetable', 'spicy', 'meat', 'sweet', 'dairy', 'normal')
  ),
  -- MVPのレアリティ。仲間化抽選の重み付けに使う。
  rarity text not null check (rarity in ('common', 'rare', 'epic', 'legendary')),
  image_key text,
  created_at timestamptz not null default now()
);

comment on table public.characters is
  'うんちくんのマスターデータ。更新はサーバー処理のみが行い、クライアントは読み取り専用。';

alter table public.characters enable row level security;

-- サインイン済みユーザー（匿名ユーザーを含む）は読み取りのみ可能。
-- 書き込みポリシーを作らないことで INSERT / UPDATE / DELETE を全て拒否する。
create policy "characters_select_authenticated"
  on public.characters
  for select
  to authenticated
  using (true);

-- 属性・レアリティでの図鑑の絞り込みを想定したインデックス。
create index characters_attribute_idx on public.characters (attribute);
create index characters_rarity_idx on public.characters (rarity);

-- マスターの更新はサーバー処理（secret key）に限定するため、
-- 公開ロールからは権限レベルでも書き込みを取り上げる。
revoke insert, update, delete on public.characters from anon, authenticated;
