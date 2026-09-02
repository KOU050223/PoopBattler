# PooPBattler

AI駆動でうんこ支援開発するぞ

モバイルWebで「揺らして戦う → 排便ログを残す → 仲間になる」体験を提供するアプリ。
設計方針は [`docs/architecture.md`](docs/architecture.md)、企画は [`docs/IDEA.md`](docs/IDEA.md) を参照。

## 技術スタック

| 領域 | 技術 |
| --- | --- |
| Webアプリ | Next.js 16 (App Router) + TypeScript |
| UI | Tailwind CSS v4 + shadcn/ui |
| アニメーション | Framer Motion |
| 一時状態 | Zustand (`persist`) |
| 認証・DB・画像 | Supabase (`@supabase/supabase-js`, `@supabase/ssr`) |
| デプロイ | Vercel |

## 必要環境

- Node.js 24（`flake.nix` で固定）
- npm

[direnv](https://direnv.net/) と [Nix](https://nixos.org/) を使う場合は、リポジトリ直下で
`direnv allow` を実行すると `flake.nix` の開発シェル（Node.js 24）が自動で有効になる。
使わない場合は Node.js 24 を各自で用意する。

> `.envrc` は Node.js のツールチェーンを用意するだけで、アプリの環境変数は読み込まない。
> 環境変数は次節の `.env.local` から Next.js が読み込む。

## セットアップ

```bash
# 1. 依存関係をインストール（ロックファイルどおりに固定して導入）
npm ci

# 2. 環境変数ファイルを作成
cp .env.local.example .env.local

# 3. .env.local に Supabase の値を記入する
```

## 環境変数

`.env.local` に以下を設定する。値は Supabase Dashboard の
**Project Settings > API** から取得する。

| 変数名 | 内容 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseプロジェクトのURL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 公開可能キー（Publishable key / anon key） |

読み込みの仕組み:

- Next.js が起動時に `.env.local` を自動で読み込む。dotenv 等の追加設定は不要。
- `NEXT_PUBLIC_` を付けた変数のみがブラウザへ配信される。付けない変数はサーバー側
  （Server Component / Server Action / Route Handler）からのみ参照できる。
- `.env.local` は `.gitignore` 済みでコミットされない。コミットするのは
  `.env.local.example` のみ。

### 秘密鍵の扱い

- **Service Role Key はリポジトリにも `.env.local.example` にも置かない。**
- 秘密情報に `NEXT_PUBLIC_` を付けない。付けるとクライアントバンドルへ埋め込まれる。
- 秘密鍵を要する処理は Server Action または Route Handler に置く。
- Vercel へは Dashboard の Environment Variables から設定する。

## 開発

```bash
npm run dev     # 開発サーバー (http://localhost:3000)
npm run build   # 本番ビルド
npm run start   # 本番サーバー
npm run lint    # ESLint
```

## データベースと型

スキーマは Supabase CLI のマイグレーションで管理し、TypeScript の型は
そこから生成する。詳細な手順は [`supabase/README.md`](supabase/README.md) を参照。

### 前提

- Supabase CLI（`flake.nix` の開発シェルに含まれる）
- Docker（型生成は `--local` でローカルDBに接続するため必要）

### 型を生成する

`db:types` は**起動中のDBの現状**から型を作る。マイグレーションのファイルを
読むわけではないので、次の2つを先に済ませておく必要がある。

```bash
supabase start           # 未起動なら起動する
supabase db reset        # migrations を適用してスキーマを最新にする
npm run db:types         # src/types/database.types.ts を生成する
```

`supabase start` は既存のDBを立ち上げるだけで、**追加したマイグレーションを
適用しない**。`db reset` を飛ばすと、スキーマ変更が反映されていない古い型が
そのまま生成される（エラーにならないので気づきにくい）。
`db reset` はDBを作り直すためローカルのデータは消える。

検証だけなら事前の起動は不要。`db:types:check` は未起動のときに一時的にDBだけ
起動し、いずれの場合も `db reset` でマイグレーションを適用してから検証する。
**このコマンドもローカルDBを作り直すため、データは消える。**

```bash
npm run db:types:check   # 生成物がマイグレーションと一致するか検証する
```

**マイグレーションを追加・変更したら必ず上記の手順で型を生成し直し、生成された
`src/types/database.types.ts` を同じコミットに含める。** 再生成漏れは pre-commit
フック（型がステージされていなければ落ちる）と CI（実際に生成し直して差分を検証）
の2段階で検出する。

生成された型は `src/lib/supabase/` の各クライアントに型引数として渡してあるため、
テーブル名・カラム名・列挙値の補完と検査がそのまま効く。

### データアクセスの境界

Supabase クライアントを生成してよいのは `features/<機能名>/actions.ts`、
`lib/supabase/`、`src/proxy.ts` の3か所だけ。ESLint は **`src/` 全体を既定で
禁止し、この3か所だけを解除する**許可リスト方式で構成してある。新しく
ディレクトリが増えても自動的に禁止側に入るため、黙って穴が空かない。

塞いでいる経路は次のとおり。

- `@/lib/supabase/client` `@/lib/supabase/server`（相対パス表記も含む）
- 生のSDK（`@supabase/ssr`、`@supabase/supabase-js`）からの直接生成
- 上記いずれかの動的 import（`await import(...)`）
- 対象拡張子は `.ts` `.tsx` `.mts` `.js` `.jsx`（tsconfig が読む範囲すべて）

UI は Server Component から渡されたデータか、機能ごとの Server Action を呼ぶ。
認証も `lib/supabase/` の関数を経由するため、この規則に例外はない。
責務の詳細は [`docs/architecture.md`](docs/architecture.md) を参照。

### 実機での検証について

`DeviceMotionEvent`（揺れ判定）と `getUserMedia()`（カメラ）は **HTTPS でのみ動作する**。
スマートフォン実機からローカルの HTTP サーバーへ直接アクセスしても利用できないため、
Vercel の Preview Deployment か HTTPS トンネルを使って検証する。

## Next.js 16 の規約メモ

このプロジェクトは Next.js 16 を使う。訓練データや過去バージョンと異なる点があるため、
実装前に `node_modules/next/dist/docs/` の該当ガイドを確認する。

- **ディレクトリ**: ソースは `src/` 配下に置く（`docs/architecture.md` の構成に準拠）。
  パスエイリアス `@/*` は `src/*` を指す。
- **App Router**: ルーティングと画面の組み立てのみを `src/app/` に置く。
  ゲームロジックや DB アクセスは書かない（`docs/architecture.md` の責務ルール参照）。
- **Proxy**: Next.js 16 で `middleware` は **`proxy` に改称**された（機能は同じ）。
  リクエスト完了前に実行する処理は、`app/` と同じ階層である **`src/proxy.ts`** に書く。
  1プロジェクトにつき1ファイルのみ。
  関数は default export または名前付き `proxy` export として公開する。
  Supabase のセッション Cookie 更新はここで行う。

  ```ts
  // src/proxy.ts
  import type { NextRequest } from 'next/server'

  export async function proxy(request: NextRequest) {
    // Supabase セッション Cookie の更新など
  }

  export const config = { matcher: [/* ... */] }
  ```

  ※ Proxy はセッション管理・認可の完全な代替ではない。認可判定は Server Action や
  Server Component 側でも行う。
# Poop Battler

## 開発環境

依存関係を取得した後、ブラウザ自動操作・画面検証に使う `agent-browser` の実行用ブラウザを一度だけ取得します。

```bash
npm install
npm run browser:install
```

動作確認には次を実行します。

```bash
npm run browser:doctor
```

以降は、ローカル依存として実行できます。

```bash
npm exec agent-browser -- --help
```
