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
- **Googleログインとアカウント連携の有効化。** 次節のとおり Dashboard 側で別途設定する。

## Googleアカウント連携をセットアップする

匿名ユーザーを Google アカウントへ昇格させる導線（issue #41）には、
コードの他に **Google Cloud 側と Supabase 側の設定**が要る。`config.toml` は
ローカルスタック専用なので、本番は必ず Dashboard で同じ設定を行う。

**Appleは対象外。** Developer Program の加入・証明書・審査で所要時間が読めず、
課金の前提を人質に取るため。継続利用版で別issueとして扱う。

### 1. Google Cloud Console で OAuth クライアントを作る

このプロジェクトのGoogle Cloudプロジェクトは `poop-battler`。以下のリンクは
そのプロジェクトに固定してある。

1. **先に OAuth consent screen を設定する。**
   <https://console.cloud.google.com/auth/overview?project=poop-battler>

   External を選び、アプリ名・サポートメール・デベロッパー連絡先を埋める。
   スコープは既定（`email`, `profile`, `openid`）のままでよい。
   公開前はテストユーザーに自分のGoogleアカウントを追加しておく。

   **順序が重要。** consent screen を設定する前に Credentials へ行くと、
   クライアントの種類に「Web application」が出てこない。

2. **Credentials > Create Credentials > OAuth client ID** を選ぶ。
   <https://console.cloud.google.com/apis/credentials?project=poop-battler>
   - Application type: **Web application**
   - **Authorized redirect URIs** に Supabase のコールバックを *完全一致* で入れる。

     | 用途 | URI |
     | --- | --- |
     | 本番（Supabaseプロジェクト） | `https://gdkfnhrqlpabnycayohi.supabase.co/auth/v1/callback` |
     | ローカルスタック | `http://127.0.0.1:54321/auth/v1/callback` |

     ホスト名は Supabase プロジェクトのもの（`NEXT_PUBLIC_SUPABASE_URL` と同じ）。
     **アプリ側の `/auth/callback` ではない**。Googleが戻る先はSupabaseで、
     そこからアプリの `/auth/callback` へ転送される。
3. 発行された **Client ID** と **Client secret** を控える。

> `gcloud` では作れない。OAuthクライアントの発行は IAP OAuth Admin API 経由に
> なるが、この API は組織に属さないプロジェクトを拒否し（`Project must belong
> to an organization`）、2026年3月19日に廃止済み。Consoleで作る。

### 2. Supabase Dashboard で有効化する（本番）

<https://supabase.com/dashboard/project/gdkfnhrqlpabnycayohi/auth/providers>

Dashboard > Authentication > **Sign In / Providers** で次の2つを行う。

1. **Google** を有効にし、上で控えた Client ID / Client Secret を貼る。
2. **Allow manual linking** を有効にする。
   これが無効だと `linkIdentity()` が `manual_linking_disabled` で失敗し、
   昇格の導線が一切動かない（画面には「アカウント連携がサーバー側で
   有効になっていません」と出る）。

また、Google のパネルでは **Enable Sign in with Google** のトグルを
忘れずに有効にする。Client ID / Secret を入れただけでは有効にならず、
画面には「Googleログインがサーバー側で有効になっていません」と出る。

`Skip nonce checks` と `Allow users without an email` は **無効のまま**にする。
前者はiOS向けの緩和でセキュリティを下げるだけ、後者を有効にすると
メールアドレスの無いユーザーが生まれ、課金時の復旧手段という
連携の目的そのものが崩れる。

### URL Configuration

<https://supabase.com/dashboard/project/gdkfnhrqlpabnycayohi/auth/url-configuration>

本番は Vercel の `https://poop-battler.vercel.app`。

- **Site URL**: `https://poop-battler.vercel.app`
- **Redirect URLs** に完全一致で追加:

```text
https://poop-battler.vercel.app/auth/callback
```

ここに無いURLを `redirectTo` に渡すと、Supabaseはエラーを返さず
**Site URL へ黙って戻す**。「連携は成功したのに元の画面に戻らない」という
形で失敗するため、追加漏れに気づきにくい。

なお `/auth/callback` はこのPRで追加するルートなので、**マージして
Vercelへデプロイされるまで本番には存在しない**（404になる）。
本番で連携を試すのはデプロイ後。

### 3. ローカルスタックで試す（任意）

Google の往復までローカルで確認したい場合のみ。

1. `.env.local` に Client ID / Secret を設定する（`.env.local.example` 参照）。

   ```bash
   SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=...
   SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=...
   ```

2. `config.toml` の `[auth.external.google]` の `enabled` を `true` にする。
3. **スタックを起動し直す。** `config.toml` の変更は `supabase db reset` では
   反映されない。認証コンテナの設定は起動時にしか読まれないため、
   `supabase stop && supabase start` が必要。

```bash
supabase stop && supabase start
```

`.env.local` の `NEXT_PUBLIC_SUPABASE_URL` がローカル（`http://127.0.0.1:54321`）を
指していることも確認する。本番URLのままだとローカルの設定は使われない。

### 昇格でユーザーIDは変わらない

`linkIdentity()` は既存の `auth.users` 行に identity を足すだけで、
`auth.users.id` は変わらない。`profiles` を作るトリガー
`on_auth_user_created` は `AFTER INSERT ON auth.users` なので昇格では発火せず、
プロフィールも増えない。**このため専用のマイグレーションは不要**で、
匿名のうちに作ったデータはそのまま昇格後のユーザーから読める。

### 既存アカウントとの衝突

そのGoogleアカウントが既に別ユーザーに紐づいている場合、Supabaseは
`identity_already_exists` を返して連携を拒否する。**MVPではデータの
マージを行わない**ため、画面はエラーを提示するだけで、両方のユーザーの
データはどちらも変更されない。

別端末で既存アカウントへ戻りたい場合は、連携ではなく
「既にアカウントをお持ちの方はこちら」からログインする。この経路は
その端末で匿名のまま作ったデータを引き継がない旨を確認してから実行する。

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
