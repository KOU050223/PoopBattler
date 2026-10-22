# web 版（Next.js）の退役計画

> [migration-proposal.md](./migration-proposal.md) で承認した案C（Supabase 直結 + Stripe 系のみ Next.js の薄い API）の続き。
> 案Cは Next.js を API として残す前提だったが、本書では UI も含めて `apps/web` を退役させ、
> ブラウザ版は Expo web で提供する。サーバー処理は新設する `apps/api` に移す。

## 1. 決定事項

| 論点 | 決定 | 理由 |
| --- | --- | --- |
| ブラウザ版の UI | Expo web（`apps/native` の web ビルド） | UI を web と native の2系統で保守するコストが大きい |
| サーバー処理の置き場所 | Hono で `apps/api` を新設する | `packages/domain` を npm workspaces からそのまま import できる。Cloudflare Workers との相性がよい |
| 課金 | RevenueCat に一本化する（ブラウザは RevenueCat Web Billing） | 権利の変化を RevenueCat の Webhook 1本で受けられ、Stripe の Webhook・Checkout・ポータルを自前で持たずに済む |
| PWA | 続ける | 現行 web 版の機能を落とさない。必要な作業は 4.6 のとおり小さい |
| ホスティング | Cloudflare（Workers）を検討する | Expo web の静的出力と `apps/api` を同じ基盤・同じドメインに置ける |

`packages/domain` は残す。共有の相手が web から `apps/api` に替わるだけで、Webhook の解釈（`billing/*-event.ts`）やバトル・レポートの計算は native と api の両方で使う。

## 2. 現状

```
apps/web (Next.js, Vercel) ─┬─ UI（ブラウザ版の全画面）
                            ├─ Server Actions（17個）
                            ├─ Webhook: api/stripe/webhook, api/iap/webhook
                            └─ auth/callback（Google OAuth の戻り先）
apps/native (Expo) ───────── UI（iOS / Android）。Supabase 直結（gateway 経由）
packages/domain ──────────── 純ロジック（web と native で共有）
apps/web/public/assets ───── 画像。native も相対パスの require で読んでいる
```

Server Actions のうち、バトル・食事・図鑑・履歴・レポートは native ではすでに Supabase の RPC と RLS で置き換わっている。サーバーでしか実行できない処理（service role や Stripe の秘密鍵が要る処理）は次の4つで、native はこのうち2つに依存している。

| 処理 | 現在の場所 | native との関係 |
| --- | --- | --- |
| RevenueCat Webhook（`subscriptions` への書き込み） | `api/iap/webhook` | 依存している。iOS で購入した権利はこの Webhook 経由でしか付かない |
| Stripe Webhook（`subscriptions` への書き込み） | `api/stripe/webhook` | 使っていない |
| Checkout 開始・顧客ポータル・解約 | `features/billing/actions.ts` | 使っていない |
| アカウント削除（Stripe の課金経路を閉じてから `auth.users` を削除） | `features/account/actions.ts` | 未実装。アカウント画面に「準備中」と表示している |

`subscriptions` は RLS が有効で書き込みポリシーが無いため、service role でしか書けない。そのため Webhook はサーバーに置くしかない。

このままでは `apps/web` を単独で削除できない。削除すると iOS の購入で権利が付かなくなり、native が読んでいる画像も消える。

## 3. 将来像

```
apps/native (Expo) ── iOS / Android / web（Expo web）
                      ブラウザで動かない機能は *.web.ts(x) で差し替える
                      画像は apps/native/assets/ に置く
apps/api (Hono) ───── 秘密鍵が要る処理と、外部から呼ばれる処理だけ
packages/domain ───── 純ロジック（native と api で共有）
Supabase ──────────── Auth / Postgres / RLS / RPC（現状維持）
```

### 3.1 処理をどこに置くか

案Cの方針（データの境界は RLS と RPC が持つ）を引き継ぎ、次の順に判定する。

1. 秘密鍵が要るか、外部サービスから呼ばれるか → `apps/api`
2. DB の中だけで完結する整合性の保証が要るか（複数テーブルの同時確定、抽選など） → RPC
3. 本人の行を読み書きするだけか → クライアントから直接（RLS で守る）

API に普通の読み書きを集める構成（案B の BFF）は採らない。native が Supabase に直結する以上 RLS は外せず、API 側でも同じ検査を持つと二重管理になる。

| 処理 | 置き場所 |
| --- | --- |
| RevenueCat Webhook | `apps/api` |
| アカウント削除 | `apps/api`（`auth.admin.deleteUser` に service role が要る。購読の解約も同じ処理で行う） |
| RevenueCat の REST API を使う処理（解約・返金など） | `apps/api`（RevenueCat の秘密鍵が要る） |
| バトル開始・完了、仲間化の抽選、合成・進化 | RPC（現状維持） |
| 食事・図鑑・履歴の読み書き | クライアントから直接 |
| 週次レポート | `apps/api`（権利を確認してから集計する。4.5 を参照） |

### 3.2 RPC と API の使い分け

上の判定で RPC を API より先に置いている理由は、処理の速さではない。主な理由は次の2つである。

- トランザクション：supabase-js（PostgREST）は1リクエストが1文で、複数の書き込みを1つのトランザクションにまとめられない。バトル完了のように「排便記録の追加・バトルの状態更新・抽選・キャラクターの付与」を同時に確定させるには、API から呼ぶ場合でも RPC が要る。
- RLS は外せない：native と Expo web は Supabase に直結するため、API を通らない経路が必ず残る。行の権限は API があっても RLS で守ることになる。

一方で、RPC は SQL で書くため、テスト・レビュー・変更の手間が TypeScript より大きい。そこで次の方針で保守の負担を抑える。

- RPC は「本人確認・入力の検証・書き込みの確定」だけを持つ薄い層にする。判定や計算のロジックは `packages/domain` に置き、vitest で検証する。
- トランザクションが要らない処理（読み取りと集計、外部サービスの呼び出し）は API に置き、TypeScript で書く。週次レポートはこれに当たる。
- 複数の書き込みを伴うロジックが増えて RPC の保守が重くなったら、API から Postgres に直接接続する構成（Cloudflare Hyperdrive と Drizzle など）を検討する。TypeScript の中でトランザクションを書けるが、RLS を経由しない接続になるため、本人確認と権限の検査を API 側で漏れなく持つ必要がある。

### 3.3 クライアントに任せないもの

判定の基準は、利用者が手元で値を書き換えたときに困るのが本人だけかどうかである。Expo web はブラウザの開発者ツールで改変できるため、native 以上にこの線引きが要る。

- 秘密の値を持たない。`EXPO_PUBLIC_*` はすべて公開情報として扱う。
- 権利を書き込まない。`subscriptions` を書くのは Webhook だけにする。
- 報酬（抽選結果、個体値、成長）を申告させない。RPC の中で決める。
- 端末の時計を、権利や報酬の判定に使わない。DB の `now()` を使う。

## 4. 確認結果

### 4.1 食事写真はサーバーに無い

写真は端末内にだけ保存しており、`meal_logs.image_path` には写真の UUID だけが入る。

- web: IndexedDB（DB 名 `poop-battler`、ストア `meal-photos`、キーは `id`、値は `{ id, blob, createdAt }`）
- native: `expo-file-system` の document 配下 `meal-photos/<uuid>.jpg`

`expo-file-system` は web で動かないため、Expo web では `PhotoStore` の web 実装（`adapters/expo-photo-fs.web.ts`）が要る。既存の利用者はいないので、現行 web 版の保存形式に合わせる必要はない。現行の IndexedDB 実装は流用できる。

### 4.2 ログインセッションの保存先が web と native で異なる

web は `@supabase/ssr` の `createBrowserClient` を使っており、セッションを Cookie に保存する。native は supabase-js に AsyncStorage を渡しており、Expo web では AsyncStorage が localStorage になる。

同じドメインで切り替えると、web 版でログインしていた利用者はログアウトした状態になり、匿名サインインの利用者は同じアカウントに戻れない。ただし既存の利用者はいないため、セッションの引き継ぎは行わない。Expo web では native と同じ AsyncStorage（localStorage）の構成をそのまま使う。

### 4.3 RevenueCat の利用者 ID は Supabase の user id

`features/billing/iap-gateway.ts` は `configure` の時点で `appUserID` に Supabase の user id を渡し、続けて `logIn` している。Web Billing でも同じ ID を使えば、iOS・Android・ブラウザの購入が1人の利用者にまとまる。

導入済みの `react-native-purchases` 10.11.0 にはブラウザ用の実装（`dist/browser`、`@revenuecat/purchases-js-hybrid-mappings`）が含まれており、Expo web でも同じ API で購入を呼べる見込みがある。実際に購入まで通るかは Phase 3 で確認する。

### 4.4 バトル完了 RPC はクライアントの申告をどこまで信じるか

`private.complete_battle`（`complete_battle_with_symptoms` から呼ばれる）は security definer で、次の処理を DB 内で行う。

- バトルが本人のもので、かつ `active` であることを行ロックしたうえで確認する
- 排便記録の値（硬さ・量・色・出しやすさ・症状）を許可された値の範囲で検証する
- 仲間化の抽選（`random()`）と個体値の決定を DB 内で行う

クライアントが送るのは排便記録の入力と食事記録の ID だけで、勝敗や報酬を申告する経路は無い。ただし次の2点は、クライアントの操作で結果を有利にできる。

- 仲間化の確率は本人の `meal_logs` の件数で決まり、`meal_logs` は本人が RLS の範囲で自由に追加できる。
- バトル開始から完了までの経過時間を検査していないため、開始直後に完了させて抽選を繰り返せる。

ランキングや他の利用者との比較が無い現状では、影響は本人のゲーム体験に限られる。対戦やランキングを入れる時点で検査を足す。

### 4.5 週次レポートの課金ゲートは表示上のもの

`features/report/report-gateway.ts` は `subscriptions` を読んで権利を判定し、権利があるときだけ本人の `bowel_logs` と `meal_logs` を取得して、`packages/domain` の `createWeeklyReport` で集計する。権利が無い経路では分析に使う列を SELECT しない。

しかし RLS は本人の記録をすべて読める設定であり、集計のロジックもアプリに同梱されている。改変したクライアントなら、権利が無くてもレポートを作れる。読めるのは本人の記録だけなので、他の利用者への影響は無い。

課金ゲートを実効的にするため、集計はサーバー側に移す。移し先は `apps/api` を第一候補とする（3.2 を参照）。集計は読み取りだけでトランザクションが要らず、`packages/domain` の `createWeeklyReport` をそのまま使える。

### 4.6 現行の PWA は manifest とインストール案内だけ

`apps/web` は `app/manifest.ts` で manifest を出し、`features/pwa/` で `beforeinstallprompt` を使ったインストール案内を出している。service worker は登録していない。Expo web でも、manifest・アイコン・インストール案内を移せば現状と同等になる。オフライン対応が要るなら、そのときに service worker を追加する。

## 5. 移行の手順

| Phase | 内容 | 完了条件 |
| --- | --- | --- |
| 0. 凍結 | `apps/web` の UI に新機能を足さない。web 固有の不具合修正だけ受け付ける | チームで合意している |
| 1. `apps/api` の新設 | Hono（Cloudflare Workers）で `apps/api` を作り、RevenueCat Webhook とアカウント削除を移す。RevenueCat ダッシュボードの Webhook URL を切り替える | native から購入して権利が付く。native からアカウントを削除できる |
| 2. Expo web の動作 | `react-native-web` を入れ、`expo start --web` で全画面を動かす。ブラウザで動かないモジュールを `*.web.ts(x)` で差し替える（4.1 の写真、カメラ、便器検出）。文言を i18next に統一する（5.3） | 現行 web 版の全画面が Expo web で動く |
| 3. 課金の一本化 | RevenueCat Web Billing をブラウザ版に入れ、Stripe の Webhook・Checkout・ポータルを廃止する | ブラウザで購入して権利が付く |
| 4. PWA とデプロイ | manifest・アイコン・インストール案内を Expo web に移す。Cloudflare 向けの GitHub Actions を preview と production の2系統で作る（5.2） | preview 環境で、Expo web が preview の `apps/api` に接続して動き、PWA としてインストールできる |
| 5. 切り替え | 本番ドメインを Expo web に向ける。外部サービスに登録した URL を切り替える（5.1） | 本番の Expo web で、ログイン・記録・バトル・購入が通る |
| 6. 片付け | `apps/web` を削除する。画像を `apps/native/assets/` に移す。domain から web 専用のコード（`battle/install-promotion-eligibility.ts` の扱いを含む）を整理する。CI・lint・ドキュメントを更新する | リポジトリに web 版のコードが残っていない |

Phase 1 は web を退役させるかどうかに関係なく必要である。アカウント削除はストア審査で求められ、native の権利付与が web のデプロイに依存している状態も解消できる。

便器検出は、現行 web 版が tfjs（coco-ssd）で実装している。Phase 2 ではこの実装を `*.web.ts` として移せるかを試す。ブラウザ版での便器検出は長期のサポート対象にしない。動かなくなったら、ブラウザでは機能を外す。

### 5.1 切り替え時に変更する外部設定

- Supabase Auth のリダイレクト URL
- Google OAuth の承認済みリダイレクト URI
- RevenueCat の Webhook URL（Phase 1 で変更済みであることを確認する）
- 環境変数とシークレット（Vercel から Cloudflare へ）
- DNS

既存の利用者はいないため、ログイン状態・写真・Stripe 購読の引き継ぎは行わない。

### 5.2 Cloudflare へのデプロイ

GitHub Actions のワークフローを preview と production の2つ作り、それぞれ Expo web（フロント）と `apps/api` をデプロイする。

| | preview | production |
| --- | --- | --- |
| 起動条件 | Pull Request | `main` への push |
| フロント | Expo web の preview 環境 | Expo web の本番環境 |
| API | `apps/api` の preview 環境 | `apps/api` の本番環境 |

preview のフロントは、必ず preview の API に接続させる。フロントが API の URL を持つ方法として、次の2案がある。

- フロントと API を同じオリジンに置き、フロントは相対パス `/api` だけを呼ぶ。Worker 側で `/api` を API に振り分ける（同じ Worker に同居させるか、Service Binding で環境ごとの API Worker に渡す）。フロントのビルドに API の URL を埋め込まないため、preview のフロントが本番の API を呼ぶ取り違えが起きない。
- API の URL を `EXPO_PUBLIC_API_URL` としてビルド時に埋め込む。preview のビルドで本番の URL を渡すと、気付かないまま本番の API を呼ぶ。

前者を第一候補とする。後者を採るなら、ワークフローで環境と URL の組を1か所から導出し、preview のビルドに本番の URL が入らないことを CI で検査する。

DB マイグレーションの本番適用（`deploy-production.yml`）と API のデプロイの順序もここで決める。preview の API がどの Supabase プロジェクトに接続するか（本番とは別のプロジェクトか、Supabase Branching か）も同時に決める。

### 5.3 文言の統一

web は next-intl（`apps/web/messages/`）、native は i18next で文言を別々に持っている。i18next（`apps/native/src/i18n/`）に統一し、web にしかない文言は Phase 2 で移す。

## 6. 未決事項とリスク

| 項目 | 内容 | 決める時期 |
| --- | --- | --- |
| アカウント削除時の解約 | RevenueCat Web Billing の購読を REST API で解約できるか。Apple の購読はサーバーから解約できないため、現行どおり案内にとどめる | Phase 1 |
| ブラウザでの便器検出 | tfjs の実装を移せるか。長期のサポート対象にはしない | Phase 2 |
| 週次レポートの集計 | `apps/api` に移す方針（4.5、3.2）。権利の判定を API と RPC のどちらで持つかを実装時に決める | Phase 1 以降 |
| 仲間化の抽選の検査 | 4.4 の2点を塞ぐか | 対戦・ランキングを入れるとき |
| preview 環境の接続先 | フロントから API への振り分け方式と、preview の API が使う Supabase プロジェクト（5.2） | Phase 4 |
| native の lint | データアクセス境界の検査が native に無い（#238）。いずれ追加する | 時期未定 |
