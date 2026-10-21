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
| 週次レポート | クライアント（現状維持。4.4 を参照） |

### 3.2 クライアントに任せないもの

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

`expo-file-system` は web で動かないため、Expo web では `PhotoStore` の web 実装（`adapters/expo-photo-fs.web.ts`）が要る。現行 web 版と同じ DB 名・ストア名・値の形で実装すれば、切り替え後もブラウザに残っている写真を読める。形を変えると、切り替えた時点でブラウザ版の写真が表示されなくなる。

### 4.2 ログインセッションの保存先が web と native で異なる

web は `@supabase/ssr` の `createBrowserClient` を使っており、セッションを Cookie に保存する。native は supabase-js に AsyncStorage を渡しており、Expo web では AsyncStorage が localStorage になる。

そのまま同じドメインで切り替えると、既存の利用者は全員ログアウトした状態になる。匿名サインインの利用者は同じアカウントに戻る手段が無く、記録をすべて失う。対策は次のどちらかで、Phase 2 で検証して決める。

- Expo web 用の Supabase クライアント（`lib/supabase.web.ts`）でも `createBrowserClient` を使い、Cookie の保存形式を引き継ぐ
- 初回起動時に Cookie のセッションを読み、localStorage へ移す

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

ランキングや他の利用者との比較が無い現状では、影響は本人のゲーム体験に限られる。対戦やランキングを入れる時点で RPC 側の検査を足す。

### 4.5 週次レポートの課金ゲートは表示上のもの

`features/report/report-gateway.ts` は `subscriptions` を読んで権利を判定し、権利があるときだけ本人の `bowel_logs` と `meal_logs` を取得して、`packages/domain` の `createWeeklyReport` で集計する。権利が無い経路では分析に使う列を SELECT しない。

しかし RLS は本人の記録をすべて読める設定であり、集計のロジックもアプリに同梱されている。改変したクライアントなら、権利が無くてもレポートを作れる。読めるのは本人の記録だけなので、他の利用者への影響は無い。有料の価値を「集計結果そのもの」に置くなら、権利を確認してから集計する RPC に移す。現時点では現状維持とし、未決事項に残す。

### 4.6 現行の PWA は manifest とインストール案内だけ

`apps/web` は `app/manifest.ts` で manifest を出し、`features/pwa/` で `beforeinstallprompt` を使ったインストール案内を出している。service worker は登録していない。Expo web でも、manifest・アイコン・インストール案内を移せば現状と同等になる。オフライン対応が要るなら、そのときに service worker を追加する。

## 5. 移行の手順

| Phase | 内容 | 完了条件 |
| --- | --- | --- |
| 0. 凍結 | `apps/web` の UI に新機能を足さない。web 固有の不具合修正だけ受け付ける | チームで合意している |
| 1. `apps/api` の新設 | Hono（Cloudflare Workers）で `apps/api` を作り、RevenueCat Webhook とアカウント削除を移す。RevenueCat ダッシュボードの Webhook URL を切り替える | native から購入して権利が付く。native からアカウントを削除できる |
| 2. Expo web の動作 | `react-native-web` を入れ、`expo start --web` で全画面を動かす。ブラウザで動かないモジュールを `*.web.ts(x)` で差し替える（4.1 の写真、カメラ、便器検出）。セッションの引き継ぎ方式（4.2）を決める | 現行 web 版の全画面が Expo web で動く |
| 3. 課金の一本化 | RevenueCat Web Billing をブラウザ版に入れる。既存の Stripe 購読者の扱いを決めて移す | ブラウザで購入して権利が付く。Stripe の Webhook を止めても既存購読者の権利が保たれる |
| 4. PWA とホスティング | manifest・アイコン・インストール案内を Expo web に移す。Cloudflare に Expo web と `apps/api` をデプロイする | 本番と同じ構成のステージングで、PWA としてインストールできる |
| 5. 切り替え | 本番ドメインを Expo web に向ける。外部サービスに登録した URL を切り替える（下のチェックリスト） | 既存の利用者がログイン状態と写真を保ったまま使える |
| 6. 片付け | `apps/web` を削除する。画像を `apps/native/assets/` に移す。domain から web 専用のコード（`battle/install-promotion-eligibility.ts` の扱いを含む）を整理する。CI・lint・ドキュメントを更新する | リポジトリに web 版のコードが残っていない |

Phase 1 は web を退役させるかどうかに関係なく必要である。アカウント削除はストア審査で求められ、native の権利付与が web のデプロイに依存している状態も解消できる。

便器検出は、現行 web 版が tfjs（coco-ssd）で実装している。Phase 2 では機能を外すのではなく、この実装を `*.web.ts` として移せるかをまず試す。

### 5.1 切り替え時に変更する外部設定

- Supabase Auth のリダイレクト URL
- Google OAuth の承認済みリダイレクト URI
- RevenueCat の Webhook URL（Phase 1 で変更済みであることを確認する）
- 環境変数とシークレット（Vercel から Cloudflare へ）
- DNS

## 6. 未決事項とリスク

| 項目 | 内容 | 決める時期 |
| --- | --- | --- |
| 既存の Stripe 購読者 | RevenueCat の Stripe 連携で既存購読を引き継げるか、切り替え時に解約・再購入を案内するか。購読者がいなければ不要 | Phase 3 の前 |
| アカウント削除時の解約 | RevenueCat Web Billing の購読を REST API で解約できるか。Apple の購読はサーバーから解約できないため、現行どおり案内にとどめる | Phase 1 |
| セッションの引き継ぎ方式 | 4.2 の2案のどちらにするか | Phase 2 |
| ブラウザでの便器検出 | tfjs の実装を移せるか、ブラウザでは機能を外すか | Phase 2 |
| 週次レポートの集計場所 | 4.5 のとおり、クライアントのままか RPC に移すか | 課金の価値を見直すとき |
| 仲間化の抽選の検査 | 4.4 の2点を RPC で塞ぐか | 対戦・ランキングを入れるとき |
| デプロイの自動化 | Vercel の自動デプロイに相当する仕組み（Cloudflare の Git 連携か GitHub Actions）と、DB マイグレーションとの適用順 | Phase 4 |
| native の lint | データアクセス境界の検査が native に無い（#238） | Phase 2 までに |
| 文言の移行 | web は next-intl（`apps/web/messages/`）、native は i18next で別々に持っている。web にだけある文言を移し漏らさない | Phase 2 |
