# i18n ライブラリ調査・比較（Issue #68）

対象リポジトリの実測にもとづく調査。結論のみ先に読む場合は「推奨」まで飛ばしてよい。

## 1. 前提：このリポジトリの実測値

| 項目 | 実測値 | 調査方法 |
| --- | --- | --- |
| Next.js | 16.3.4（App Router） | `package.json` |
| React | 19.2.8 | `package.json` |
| ルート構成 | `src/app/(app)/{battle,collection,logs,meals}` — **`[locale]` セグメントなし** | `find src -type d` |
| Server / Client 比率 | 全 73 ファイル中 Client Component は 18 | `grep -rl '"use client"'` |
| 日本語文言を含むファイル | 41（テスト除く） | 下記注記 |
| 実文言のおおよその数 | **133 行**（テスト・コメント除外後） | 下記注記 |
| ミドルウェア | `src/proxy.ts`（Next 16 で `middleware` → `proxy` に改称済み） | `cat src/proxy.ts` |
| 認証 | Supabase の Cookie セッション（`updateSession` が全ルートを通過） | `src/lib/supabase/proxy.ts` |

文言数の数え方：段階的に絞り込んだ結果は次のとおり。再現できるよう全コマンドを記載する
（本 PR のブランチ上で実行した値）。

```bash
# (1) 日本語を含む行（テスト込み）= 351
grep -rnP '[\p{Hiragana}\p{Katakana}]' src --include='*.ts' --include='*.tsx' | wc -l

# (2) テストファイルを除外 = 216
grep -rnP '[\p{Hiragana}\p{Katakana}]' src --include='*.ts' --include='*.tsx' \
  | grep -v '\.test\.' | wc -l

# (3) さらに行頭コメント(// * /*)を除外 = 133 ← 翻訳対象の目安
grep -rnP '[\p{Hiragana}\p{Katakana}]' src --include='*.ts' --include='*.tsx' \
  | grep -v '\.test\.' | grep -vP ':\s*(//|\*|/\*)' | wc -l

# (4) 対象ファイル数（テスト除く） = 41
grep -rlP '[\p{Hiragana}\p{Katakana}]' src --include='*.ts' --include='*.tsx' \
  | grep -v '\.test\.' | wc -l
```

この (3) の 133 行が実際に翻訳対象となる UI 文言の目安である。

なお本ドキュメントの初版には「515 行」と記載していたが、これは `grep -o` による
**マッチ数**であり、行数（351）と取り違えた誤りだった。上記のとおり訂正する。

翻訳対象には次の 3 種類が混在している。移行コストはこの内訳に効く。

1. Client Component 内の JSX（例 `battle-screen.tsx`）
2. **Server Component の `metadata` export**（例 `battle/page.tsx:7` の `title: "バトル"`）
3. **Server Action 内のエラーメッセージ**（例 `start-battle.ts:48` の `AUTH_ERROR`）

2 と 3 は React のフックが使えない文脈なので、「Server 側で await して翻訳を取れるか」が
ライブラリ選定の実質的な分岐点になる。

## 2. 最初に決めるべきこと：ロケールを URL に載せるか

ライブラリの機能比較よりも、この選択のほうが移行コストを支配する。

| 方式 | URL | 移行コスト | 向くケース |
| --- | --- | --- | --- |
| パスセグメント | `/ja/battle` | **大** — 全ルートを `src/app/[locale]/(app)/…` へ移動し、`Link`/`redirect` を全面書き換え | SEO、言語別 URL の共有 |
| Cookie / ユーザー設定 | `/battle` のまま | **小** — ルート移動なし | ログイン前提のアプリ |

本アプリは Supabase 認証済みユーザー向けのゲームで、公開ページを言語別に検索させる要件は
Issue に書かれていない。Issue #68 の本文は「i18nextとか？」の 1 行のみのため、
**ここでは「Cookie ベース・URL にロケールを載せない」を前提として比較する**（要確認事項）。

#### Cookie 方式の実コスト：静的レンダリングを失う

**訂正（レビュー指摘により実測）**：本ドキュメントの初版では「`src/proxy.ts` が全リクエストで
Supabase セッションを更新しているので既に動的レンダリングであり、Cookie 方式の欠点は
当てはまらない」と書いていたが、これは**誤り**である。Proxy（ミドルウェア）の実行は
App Router ページのレンダリング方式を動的にしない。

i18n 導入前後で `npm run build` の出力を実測した結果は次のとおり。

| ルート | 導入前 | 導入後 |
| --- | --- | --- |
| `/` | ○ Static | ƒ Dynamic |
| `/battle` | ○ Static | ƒ Dynamic |
| `/collection` | ○ Static | ƒ Dynamic |
| `/logs` | ○ Static | ƒ Dynamic |
| `/meals` | ƒ Dynamic | ƒ Dynamic |

つまり Cookie 方式には **6 ルート中 4 ルートの静的プリレンダリングを失う**という
実コストがある。`src/i18n/request.ts` の `cookies()` 呼び出しがルートツリー全体を
リクエスト依存にするためである。

これを踏まえた評価：本アプリはログイン前提のゲームで、`/meals` は既に動的、
残りのページもユーザー固有の状態を表示する性質が強い。そのため静的配信の恩恵は
もともと限定的であり、**このトレードオフは受け入れられる**と判断する。
ただし「コストが無い」わけではない点は明記しておく。

パスセグメント方式（`/ja/battle`）を選べば `generateStaticParams` によって
静的プリレンダリングを維持できる。静的配信を重視する場合はそちらが有利であり、
この点は第 6 節の未確定事項（URL にロケールを載せるか）を判断する材料になる。

## 3. 比較

比較軸は「機能の多さ」ではなく「このリポジトリでの導入コスト」順に並べた。

| 軸 | next-intl 4.14.2 | next-i18next 16.1.1 (+i18next 26) | Lingui 6.6.0 | Paraglide JS 2.25.0 | ライブラリなし（自前辞書） |
| --- | --- | --- | --- | --- | --- |
| Server Component 対応 | ◎ `getTranslations()` を await | ◎ v16 の `getT()` | ○ | ◎ 単なる関数呼び出し | ◎ |
| Client Component 対応 | ◎ `useTranslations()` | ◎ `useT()` | ◎ | ◎ | △ 自前 Context が必要 |
| URL なし（Cookie）方式 | ◎ **公式サンプルあり**（`example-app-router-without-i18n-routing`） | ◎ v16 の No-Locale-Path モード | ○ 自前配線 | ○ 自前配線 | ◎ |
| ルート移動の要否 | 不要 | 不要 | 不要 | 不要 | 不要 |
| Next 16 の統合方式 | ◎ peerDeps に `^16.0.0` を明示 | ○ peerDeps は `>= 14.1.0` | △ `babel-plugin-macros` を peer に要求（SWC と別系統） | △ **webpack プラグインのみ**（Turbopack 用の設定は公式サンプルに無い） | — |
| 型付きキー | ◎ `messages` から型生成 | ○ 型定義の自前拡張 | ◎ | ◎ 生成関数なので自然に型安全 | ◎ |
| ICU（複数形など） | ◎ 標準 | ○ プラグイン | ◎ | ○ | ✕ 自前実装 |
| バンドル | ロケール別に分割 | 名前空間で分割 | ロケール別 | ◎ 未使用メッセージを tree-shake | 最小 |
| メンテナンス | 活発（2026-09 更新） | 活発（2026-09 更新） | 活発 | 活発 | — |

peerDependencies とバージョンは `npm view` で実際に取得した値（2026-09 時点）。

### Turbopack 対応の検証結果（実装時に確認）

Paraglide を「webpack プラグインのみ」で見送った以上、next-intl 自身が同じ問題を
抱えていないかを実装前に確認した。結論は問題なし。

`node_modules/next-intl/dist/esm/production/plugin/getNextConfig.js` の実装では
`const x = m || a()`（`m` = `process.env.TURBOPACK`、`a` = `isNextJs16OrHigher()`）となっており、
**Next 16 では Turbopack が既定の経路**、webpack はフォールバックである。
Next 16 で安定版になった `turbopack` キーへの分岐（`hasStableTurboConfig()`）も実装されている。

実際に `npm run build` が `▲ Next.js 16.3.4 (Turbopack)` で成功することも確認済み。

### 補足：Issue 本文の「i18next」について

`next-i18next` は長らく Pages Router 専用で、App Router では使えないという評価が定着していた。
**しかし v16 で App Router に正式対応している**ことを README で確認した
（`getT()` / `useT()` / `createProxy()`、および Cookie ベースの No-Locale-Path モード）。
したがって Issue で挙がっている i18next 系は、現在では選択肢から外す理由がない。
古い情報だけで却下しないよう、ここに明記しておく。

## 4. 推奨：next-intl

### 追加要件：10言語対応（Issue #68 コメントより）

「修正を最小限に、10言語を目指す」という要件が追加された。これは推奨を変えない。
むしろ next-intl の優位を強める。

next-intl はロケール別にファイルを分割し、**アクティブなロケールのみを動的 import** する
（`messages/${locale}.json`）。したがって対応言語を 10 に増やしても、利用者が受け取る
バンドルは 1 言語分のままで、2言語のときとほぼ変わらない。必要ならさらに次の手段がある。

- `NextIntlClientProvider` に渡すメッセージを `pick` で絞り、Client へ送る量を減らす
- ビルド時のメッセージ precompile（`experimental.messages.precompile`）

結果として「10言語」はコード修正量ではなく、**言語ごとに次の 2 つを追加する作業**に収束する。

1. `messages/<locale>.json`（翻訳ファイル）
2. `src/i18n/config.ts` の `locales` 配列への追加

**2 を忘れると `isSupportedLocale()` が新しいロケールを弾き、Cookie で指定しても
日本語に無言でフォールバックする**（レビュー指摘により明記）。許可リストを設けているのは
Cookie の値が利用者側で任意に変更できるためで、これは意図した設計である。

いずれも定型作業であり、画面側のコードを触る必要は無い。

なお 10言語では ICU の複数形が実質的に必須になる（日本語には複数形が無いが、
英語・ロシア語・アラビア語などでは必要）。next-intl は ICU MessageFormat を標準で
サポートしており、この点でも追加コストが無い。

### 推奨理由

次の 3 点。

1. **URL にロケールを載せない構成の公式サンプルが存在する**。上表のとおり本リポジトリは
   ルート移動を避けたい状況であり、この方式が「非公式な回避策」ではなく公式にサポートされた
   経路であることの価値が大きい。
2. **Server Component / Server Action / `metadata` を同一の API で扱える**。本リポジトリの
   翻訳対象 130 行には `metadata` の `title` と Server Action のエラー文字列が含まれており、
   ここが最も手当てを忘れやすい。
3. **Next 16 を peerDependencies で明示している**。next-i18next の `>= 14.1.0` より、
   バージョン整合の意図が明確。

### 文言の外出し以外に必要なコード修正（実測）

grep で確認した限り、ロケール依存のハードコードは次の 2 箇所のみで、いずれも 1 行で済む。

| 箇所 | 現状 | 対応 |
| --- | --- | --- |
| `src/app/layout.tsx:32` | `lang="ja"` | `getLocale()` の結果を渡す |
| `src/features/meal/components/meal-log-list.tsx:18` | `Intl.DateTimeFormat("ja-JP", …)` | next-intl の `useFormatter()` |

「修正を最小限に」という要件に対して、この 2 箇所の少なさが実測の裏付けになる。

next-i18next v16 も要件は満たすため、チームに i18next の知見が既にある場合は妥当な次点。
Paraglide は未使用メッセージを tree-shake できる点が魅力だが、公式の Next.js サンプルを
確認したところ統合手段が `paraglideWebpackPlugin` のみで、Turbopack 向けの設定が存在しない。
さらに Server Component では `overwriteGetLocale()` によるランタイムの上書きと
`@ts-expect-error` を伴う `headers()` の同期読みが必要で、公式サンプル自体が型を回避している。
Next 16 は Turbopack が既定であり、この組み合わせの検証コストは小さくないため今回は見送る。

Lingui は `@lingui/core` が `babel-plugin-macros` を peerDependencies に要求する。
Next 16 の SWC パイプラインとは別系統のため、ビルド設定の追加が必要になる。

## 5. 段階的な移行案（このファイル構成に対して）

1. **基盤**：`next-intl` 導入、`src/i18n/request.ts` で Cookie からロケール解決、
   `messages/ja.json` を用意。ルート移動は行わない。既存 UI は無変更のまま通ることを確認する。
2. **文言の外出し（ja のみ）**：日本語を `ja.json` へ移す。ここで表示が 1 文字も変わらないことが
   検証条件になる。対象は画面単位で分割すると差分が追いやすい
   （`meals` → `battle` → `logs` → `collection` の順が、文言数の偏りに対して素直）。
3. **Server 側の取りこぼし対応**：`metadata` と Server Action のエラー文字列を移す。
   ここを 2 と分けるのは、フックが使えず書き方が変わるため。
4. **ロケール連動**：`lang` 属性と日付フォーマットを上表のとおり置き換える。
5. **2言語目の追加**：`messages/en.json` の作成、`src/i18n/config.ts` の `locales` への
   追加、そして言語切り替え UI。ここで初めて ICU の複数形が要る。
   1言語目と2言語目の間には配線の差があるが、**2言語目と10言語目の間には差が無い**。
   以降は「翻訳ファイル + `locales` への 1 行追加」で増やせる。

1 と 2 の間で一度動作確認を挟めば、「ライブラリは入ったが表示が壊れた」と
「文言の移し漏れ」を切り分けられる。

## 6. 未確定事項（実装前に確認したい）

- **ロケールを URL に載せる必要があるか**。本書は「載せない」前提で書いている。
  載せる要件があるなら移行コストは大きく増える（全ルートを `src/app/[locale]/(app)/…` へ
  移動し、`Link` / `redirect` を全面的に書き換える）。
  ただし **その場合でも推奨は next-intl のまま変わらない**。`defineRouting` と
  `localePrefix` によるパスセグメント方式は next-intl が最も手厚く、
  変わるのは第 5 節の移行コスト見積りだけである。
- 10言語の具体的な内訳（対象言語）。RTL（アラビア語・ヘブライ語）を含む場合のみ、
  `dir` 属性と CSS の論理プロパティ対応が追加で必要になる。
- 言語切り替えを Supabase のユーザープロフィールに永続化するか、Cookie のみか。
