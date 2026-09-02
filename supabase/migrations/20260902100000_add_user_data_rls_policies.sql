-- ユーザー固有データ（食事・バトル・排便・所有キャラクター）のRLSポリシーを定義する。
-- テーブル作成時にRLSは有効化済みだが、ポリシーが無いため現状は全ての行が拒否される。
--
-- 方針
-- 1. `to authenticated` を必ず付ける。匿名サインインのJWTロールは `anon` ではなく
--    `authenticated`（`is_anonymous: true`）なので、これで匿名ユーザーも対象になる。
--    ロールを絞ると、ポリシーの評価対象にならない `anon` のリクエストが早期に落ちる。
-- 2. `auth.uid()` は `(select auth.uid())` と書く。initPlan として1回だけ評価され、
--    行ごとの再評価にならない。
-- 3. UPDATE には USING と WITH CHECK の両方を書く。USING だけでは更新後の行が
--    検査されず、`user_id` を他人のIDへ書き換えて行を渡せてしまう。
-- 4. DELETE ポリシーはどのテーブルにも作らない。MVPに記録の削除機能は無く、
--    RLS有効かつポリシー不在で全ロールから拒否される。削除が必要になった時点で
--    本人限定のポリシーを追加する。
-- 5. RLSだけに頼らず、テーブル権限そのものからも不要な操作を取り上げる
--    （このファイル末尾の revoke）。

-- ---------------------------------------------------------------------------
-- meal_logs: 本人が SELECT / INSERT / UPDATE できる
-- ---------------------------------------------------------------------------
-- 食事の登録・修正はクライアント（Server Action経由のユーザーセッション）が直接行う。
create policy "meal_logs_select_own"
  on public.meal_logs
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "meal_logs_insert_own"
  on public.meal_logs
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "meal_logs_update_own"
  on public.meal_logs
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- battle_results: 本人が SELECT / INSERT / UPDATE できる
-- ---------------------------------------------------------------------------
-- 現状はユーザーセッションでバトルの作成・進行を行うため INSERT / UPDATE を許可する。
-- ただし仲間化抽選（companionship_result）はサーバー側で確定させる設計のため、
-- 抽選結果や status をクライアントが自由に書き換えられる余地がこのポリシーには残る。
-- 列単位の制限は completeBattleAction のRPC化と合わせて別Issueで詰める。
create policy "battle_results_select_own"
  on public.battle_results
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- meal_log_id は本人の食事ログしか指せない。user_id だけを見ると、他人の
-- 食事ログのUUIDを知っているユーザーが「自分名義だが他人の食事を参照する」
-- バトルを作れてしまう。外部キーは行の存在しか検査しないため、所有者の一致は
-- ポリシー側で見る必要がある（他人の食事IDの存在確認にも使えてしまう）。
-- meal_logs のRLSに暗黙に頼らず、所有者を明示的に突き合わせる。
create policy "battle_results_insert_own"
  on public.battle_results
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      meal_log_id is null
      or exists (
        select 1
        from public.meal_logs m
        where m.id = meal_log_id
          and m.user_id = (select auth.uid())
      )
    )
  );

create policy "battle_results_update_own"
  on public.battle_results
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      meal_log_id is null
      or exists (
        select 1
        from public.meal_logs m
        where m.id = meal_log_id
          and m.user_id = (select auth.uid())
      )
    )
  );

-- ---------------------------------------------------------------------------
-- bowel_logs: 本人が SELECT だけできる
-- ---------------------------------------------------------------------------
-- 排便ログは「本人のactiveなバトルに対して1件だけ」という条件付きで作られる。
-- この不変条件はRLSの行単位の述語では表現しきれないため、書き込みはクライアントに
-- 許さず、完了用RPC（security definer）またはサーバー処理に限定する。
-- INSERT / UPDATE ポリシーを作らないことがその制限そのものになる。
create policy "bowel_logs_select_own"
  on public.bowel_logs
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- user_characters: 本人が SELECT だけできる
-- ---------------------------------------------------------------------------
-- 所有キャラクターはサーバー側の仲間化抽選の結果としてのみ増える。
-- クライアントが直接INSERTできると図鑑を自由に埋められるため、bowel_logs と同じく
-- 書き込みポリシーを作らない。
create policy "user_characters_select_own"
  on public.user_characters
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- テーブル権限（RLSの手前の防御線）
-- ---------------------------------------------------------------------------
-- Supabaseは public スキーマの新しいテーブルへ anon / authenticated 双方に
-- 全テーブル権限（SELECT/INSERT/UPDATE/DELETE に加えて TRUNCATE、REFERENCES、
-- TRIGGER、MAINTAIN）を自動で付与する。RLSポリシーが無くても「権限はある」状態。
--
-- とくに TRUNCATE は行単位の権限ではないため **RLSが一切効かない**。
-- authenticated に残したままだと、匿名ユーザー1人が全ユーザーの行を消せる
-- 状態になる（現時点ではPostgRESTにTRUNCATEを発行する経路が無いため到達
-- できないが、security invoker のRPCを1つ足した時点で実際に到達する）。
-- MAINTAIN（PG17〜）も同様に行単位ではない。
--
-- 個別にrevokeを並べると今回のような取りこぼしが起きるため、
-- 「一度すべて剥がしてから、必要なものだけを grant する」形にする。
revoke all on
  public.profiles,
  public.characters,
  public.meal_logs,
  public.battle_results,
  public.bowel_logs,
  public.user_characters
from anon, authenticated;

-- マスターは全員が読めるだけ。
grant select on public.characters to anon, authenticated;

-- プロフィールは本人が読むだけ（作成はトリガーが行う）。
grant select on public.profiles to authenticated;

-- 食事とバトルはクライアントが作成・更新する。DELETEは付けない。
grant select, insert, update on public.meal_logs to authenticated;
grant select, insert, update on public.battle_results to authenticated;

-- 排便ログと所有キャラクターは読み取り専用。書き込みはサーバー処理のみ。
grant select on public.bowel_logs to authenticated;
grant select on public.user_characters to authenticated;
