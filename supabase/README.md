# Supabase

このディレクトリはSupabaseのローカルプロジェクト定義を持つ。スキーマ変更は
Supabase CLIのimperative migrations方式で管理し、`migrations/` に追記していく。

```text
supabase/
├─ config.toml     # ローカルスタックの設定（匿名サインインの有効化など）
├─ migrations/     # 適用順に並ぶマイグレーション。CLIが採番する
└─ seed.sql        # ローカルの `db reset` でのみ適用されるデモ用データ
```

## 必要環境

- Supabase CLI（`flake.nix` の開発シェルに含まれる）
- Docker（ローカルスタックの起動に必要）

`npm install` を実行すると、`prepare` スクリプトでlefthookのGitフックが導入される。

## ローカル開発

```bash
supabase start          # Docker上にローカルスタックを起動
supabase db reset       # DBを作り直す → migrations を適用 → seed.sql を適用
supabase stop           # 停止
```

`supabase db reset` はDBを作り直すため、ローカルのデータは消える。
マイグレーションとseedの再現性は、このコマンドで確認する。

> 環境によっては storage コンテナのヘルスチェックが失敗して `supabase start` が
> 中断することがある。その場合は `supabase start -x storage-api` のように除外して起動する。
> 除外できるコンテナ名は `supabase start --help` の `-x` に一覧がある。

起動後の接続情報（API URL、Publishable key）は `supabase status` で確認できる。
`.env.local` にはこの値を設定する。

## スキーマを変更する

ファイル名は手で書かず、必ずCLIに採番させる。

```bash
supabase migration new <説明的な名前>
```

生成された空ファイルにSQLを書き、`supabase db reset` が通ることを確認する。
**適用済みのマイグレーションは書き換えない。** 変更は常に新しいマイグレーションを
追加して表現する。

RLSやトリガー、関数を変更した後は、次のコマンドで問題がないことを確認する。

```bash
supabase db advisors --local
```

### RLSを検証する

ポリシーやテーブル権限を変更したら、実際に2ユーザー分のセッションを作って
検証する。

```bash
npm run db:test:rls
```

`scripts/sql/rls-verify.sql` が、匿名ユーザー2人分のデータに対して
「本人の行は許可・他人の行はSELECT/INSERT/UPDATE/DELETEすべて拒否」と、
公開ロールに余計なテーブル権限が残っていないことを検査する。1件でも
期待と違えば非ゼロで落ちる。

検証は `set local role authenticated` と `request.jwt.claims` を設定した状態で
実行する。`postgres` ロールはRLSをバイパスするため、これを忘れると全ての
検査が素通りして「合格」に見えてしまう。

### 型を再生成する

スキーマを変更したら、TypeScriptの型を必ず生成し直してコミットする。

```bash
npm run db:types      # src/types/database.types.ts を生成する
```

再生成漏れは2段階で検出する。

- **pre-commit（lefthook）**: `supabase/migrations/` を変更したコミットに
  `src/types/database.types.ts` が含まれていなければ落とす。Dockerは使わず即座に終わる。
- **CI**: 実際に型を生成し直し、コミットされた内容と差分がないかを検証する。
  手元では `npm run db:types:check` で同じ検査を実行できる。

## リモート（Supabaseプロジェクト）へ適用する

初回だけプロジェクトを紐付ける。

```bash
supabase login
supabase link --project-ref <project-ref>   # Dashboard の URL に含まれる ID
```

以降はマイグレーションをpushする。

```bash
supabase db push            # 未適用のマイグレーションをリモートへ適用する
supabase migration list     # ローカルとリモートの適用状況を突き合わせる
```

### リモートで別途必要な作業

- **`seed.sql` は `db push` では適用されない。** seedはローカルの `db reset` 専用。
  本番へデモ用キャラクターを入れる場合は、`seed.sql` の内容をDashboardのSQL Editorで
  実行する（`on conflict do update` のため再実行しても安全）。恒久的に必要なマスターデータは
  seedではなくマイグレーションとして切り出す。
- **匿名サインインの有効化。** `config.toml` の `enable_anonymous_sign_ins` は
  ローカルスタック用の設定。本番では Dashboard > Authentication > Sign In / Providers から
  Anonymous Sign-Ins を有効にする。

## 型安全なアクセス

`src/types/database.types.ts` はマイグレーションから生成したスキーマの型で、
`src/lib/supabase/` の各クライアントに `createBrowserClient<Database>` のように
型引数として渡している。これによりテーブル名・カラム名のタイポや、戻り値の
取り違えがコンパイル時に検出される。

属性・レアリティは `text` + CHECK 制約ではなく **enum 型**で定義しているため、
生成された型にもユニオン型として現れる。アプリ側で列挙値を再定義せず、
これを参照すること。

```ts
import type { Database } from "@/types/database.types";

type CharacterAttribute = Database["public"]["Enums"]["character_attribute"];
// "curry" | "vegetable" | "spicy" | "meat" | "sweet" | "dairy" | "normal"
```

列挙値を増やす場合はマイグレーションで `alter type ... add value` を追加し、
`npm run db:types` で型を再生成する。

## スキーマの方針

詳細は [`../docs/architecture.md`](../docs/architecture.md) を参照。

- 個人データを持つテーブルはRLSを有効にし、`auth.uid()` による本人限定アクセスを基本とする。
- ポリシー内の `auth.uid()` は `(select auth.uid())` と書き、行ごとの再評価を避ける。
- 匿名ユーザーのJWTロールは `anon` ではなく `authenticated`（`is_anonymous: true`）。
  ポリシーの `to` 句には `authenticated` を指定する。
- `characters` などのマスターは読み取り専用にする。書き込みポリシーを作らないことに加えて、
  公開ロールから権限自体をrevokeする。
- 列挙値はCHECK制約ではなくenum型で定義する。生成される型に反映され、
  DBとアプリで定義が二重管理にならない。
- `security definer` 関数は `set search_path = ''` を付け、参照を全てschema修飾し、
  公開ロールから `EXECUTE` をrevokeする。
- UPDATEポリシーには `USING` と `WITH CHECK` の両方を書く。`WITH CHECK` を省略すると
  `USING` が更新後の行にも適用される仕様だが、暗黙の挙動に頼らず明示する。
- Supabaseは `public` の新しいテーブルへ `anon` / `authenticated` 双方に
  SELECT/INSERT/UPDATE/DELETE を自動付与する。RLSだけに頼らず、使わない操作は
  マイグレーションで明示的にrevokeする。

### 書き込み経路の制限

`bowel_logs` と `user_characters` にはINSERT/UPDATEポリシーを作っていない。
これらは「本人のactiveなバトルに対して1件だけ」という、行単位の述語では
表現しきれない不変条件のもとでのみ増えるため。

したがって `completeBattleAction` は、この2つのテーブルへ**ユーザーセッションから
直接書き込めない**。`security definer` のRPC（`set search_path = ''`、公開ロールから
`EXECUTE` をrevoke）を用意するか、secret keyを使うサーバー処理として実装すること。
