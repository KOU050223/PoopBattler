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

## ローカル開発

```bash
supabase start          # Docker上にローカルスタックを起動
supabase db reset       # DBを作り直す → migrations を適用 → seed.sql を適用
supabase stop           # 停止
```

`supabase db reset` はDBを作り直すため、ローカルのデータは消える。
マイグレーションとseedの再現性は、このコマンドで確認する。

> 環境によっては storage コンテナのヘルスチェックが失敗して `supabase start` が
> 中断することがある。その場合は `supabase start -x storage` のように除外して起動する。

起動後の接続情報（API URL、Publishable key）は `supabase status` で確認できる。
`.env.local` にはこの値を設定する。

## スキーマを変更する

ファイル名は手で書かず、必ずCLIに採番させる。

```bash
supabase migration new <説明的な名前>
```

生成された空ファイルにSQLを書き、`supabase db reset` が通ることを確認してから
コミットする。**適用済みのマイグレーションは書き換えない。** 変更は常に新しい
マイグレーションを追加して表現する。

RLSやトリガー、関数を変更した後は、次のコマンドで問題がないことを確認する。

```bash
supabase db advisors --local
```

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

## スキーマの方針

詳細は [`../docs/architecture.md`](../docs/architecture.md) を参照。

- 個人データを持つテーブルはRLSを有効にし、`auth.uid()` による本人限定アクセスを基本とする。
- ポリシー内の `auth.uid()` は `(select auth.uid())` と書き、行ごとの再評価を避ける。
- 匿名ユーザーのJWTロールは `anon` ではなく `authenticated`（`is_anonymous: true`）。
  ポリシーの `to` 句には `authenticated` を指定する。
- `characters` などのマスターは読み取り専用にする。書き込みポリシーを作らないことに加えて、
  公開ロールから権限自体をrevokeする。
- `security definer` 関数は `set search_path = ''` を付け、参照を全てschema修飾し、
  公開ロールから `EXECUTE` をrevokeする。
