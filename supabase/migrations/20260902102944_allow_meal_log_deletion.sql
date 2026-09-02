-- 食事ログの削除は本人の行に限定する。画像本体の削除はクライアントのIndexedDBで行う。
create policy "meal_logs_delete_own"
  on public.meal_logs
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant delete on public.meal_logs to authenticated;
