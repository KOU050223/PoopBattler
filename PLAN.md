# PLAN: PoopBattler Native化（Expo / 案C）

統合ブランチ: `orch/native-app`（`guriguri00451/MakeNativeApp` から作成）
方針の根拠: `docs/native/migration-proposal.md`, `docs/native/ideal-architecture.md`（承認済み: 案C・3D維持・便器検出維持・課金ゲート現状同等）
範囲: 全機能（バトル含む）／構成: npm workspaces（`apps/web` `apps/native` `packages/domain`）
検証の限界: Expo実機/シミュレータでの見た目は指示役が確認できない。native UIタスクは `needs-human-review` で止める。自動判定は typecheck / vitest / `expo export` で行う。

## 共通の完成条件（全タスク）
- `npm run typecheck`, `npm test`, `npm run lint` が通る（workspace化後は各workspaceで）
- Webの既存テストを消さない・緩めない

## フェーズ0: 土台（直列・単独実行）

### T-001 npm workspaces化
- 種類：logic
- やること：現行 `src/ public/ messages/ next.config.ts` 等を `apps/web/` に移動。ルート `package.json` に workspaces 設定。`supabase/` はルート維持。lefthook・CI(`.github/workflows`)・`scripts/`・vercel設定のパスを追従
- 触ってよいファイル：リポジトリ全体（このタスクのみ。他タスクは並行させない）
- 完成の条件：`npm install` 後 `npm run typecheck && npm test && npm run lint && npm run build -w apps/web` が通る。`git mv` でRename検出されること
- 依存：なし

## フェーズ1: 並列（最大3）

### T-002 domain: battle純粋層の切り出し
- 種類：logic
- やること：`packages/domain`（`@poopbattler/domain`、依存ゼロ）を新設し、migration-proposal §2.1 の battle 系ファイル（constants/types/runtime/commands/snapshot/screen-view/enemy-generator/rental-party/start-battle/companionship-*/toilet-detection/special-motion/complete-battle-error/post-battle-meal-session）をテストごと移動。`battle-speed`/`battle-store` は §2.2 に従い分割（ストレージはポート注入）。`isFirstCompletedBattle` をpwa依存から分離。web側importを更新
- 触ってよいファイル：`packages/domain/**`, `apps/web/src/features/battle/**`, `apps/web/src/features/pwa/**`, `apps/web/src/stores/**`
- 完成の条件：`npm test` 全通過、`npm run typecheck`、domainが `react`/`next`/`@supabase/*` をimportしていない（grepで0件）
- 依存：T-001

### T-003 domain: records/report/account/billing/motion/i18n設定
- 種類：logic
- やること：§2.1 の records・foundation 系（meal/bowel-log/collection型、`party-lineup`純粋部、report集計一式、account/auth純関数、`stripe-event`、`lib/motion`純粋部、i18n config）を `packages/domain` へ移動。`ports.ts`（KeyValueStorage / PhotoStore / CameraStream 等）を定義。`database.types.ts` を共有
- 触ってよいファイル：`packages/domain/**`（T-002と別サブディレクトリ `records/ report/ account/ billing/ motion/ i18n/ ports.ts`）, `apps/web/src/features/{meal,bowel-log,collection,report,account,auth,billing}/**`, `apps/web/src/lib/motion*`, `apps/web/src/i18n/**`
- 完成の条件：T-002と同じ
- 依存：T-001（T-002とはディレクトリが分かれるため並列可。`packages/domain/index`/package.json の衝突は指示役が解消）

### T-004 apps/native スキャフォールド
- 種類：ui
- やること：`apps/native` にExpo（expo-router, TypeScript）を新設。supabase-js(AsyncStorage persist)・匿名サインイン、`i18next`+`expo-localization`（`messages/*.json`共有）、フォント(Nunito)、タブ骨組み（バトル/記録/コレクション/レポート/アカウントの空画面）、`@poopbattler/domain` 参照、Metroのworkspace設定、`EXPO_PUBLIC_*` env
- 触ってよいファイル：`apps/native/**`、ルート`package.json`のworkspaces/scripts、`packages/i18n/**`（必要なら）
- 完成の条件：`npm run typecheck -w apps/native`、`npx expo export --platform ios -w apps/native` が成功、domainのvitestがnative側からimportできる（スモークテスト1本）
- 見た目の条件：シミュレータでタブ5つが表示・遷移（人間確認）
- 依存：T-001（domain参照は T-002/003 完了後に結線。先に空importで可）

## フェーズ2: 並列（T-002〜004 完了後）

### T-005 アプリ内課金（IAP）の権利付与バックエンド
- 種類：logic（決済・DBスキーマ・権限 → 着手前に人間承認、最終レビュー必須）
- 方針：native は **IAP のみ**（Stripe を native から呼ばない）。Web版の Stripe は現状維持。権利の正は `subscriptions`（`hasActiveEntitlement`）に一本化
- やること：①`subscriptions` に提供元(`provider`: stripe|apple)と外部ID列を足す migration（ファイル作成のみ・適用しない）②RevenueCat webhook を受ける `POST /api/iap/webhook`（共有シークレット検証・service role で `subscription-write`）③型再生成・RLSテスト追加。`resolveStripeEvent` 相当の純関数 `resolveIapEvent` を domain に置きテスト
- 触ってよいファイル：`supabase/migrations/**`, `apps/web/src/app/api/iap/**`, `apps/web/src/features/billing/**`, `packages/domain/billing/**`, `apps/web/src/types/database.types.ts`
- 完成の条件：vitestで 署名/シークレット不正は拒否・購入/更新/期限切れ/返金の各イベントでsubscriptions状態が正しく遷移・他人の行を書けない、`db:test:rls`、全テスト通過
- 依存：T-003

### T-006 native 記録系（meal/bowel-log/collection）
- 種類：ui
- やること：PhotoStore(expo-file-system)・KeyValueStorage(AsyncStorage)アダプタ、食事記録（expo-image-picker/camera）、排便ログ履歴、コレクション/パーティ編成。Server Action→supabase直結（§1.4対応表）
- 触ってよいファイル：`apps/native/src/features/{meal,bowel-log,collection}/**`, `apps/native/app/(tabs)/{records,collection}*`, `apps/native/src/adapters/**`
- 完成の条件：native側vitestでgateway/アダプタのテスト、typecheck、`expo export`
- 依存：T-003, T-004

### T-007 native レポート/アカウント/課金
- 種類：ui（課金・認証 → 最終レビュー必須）
- やること：週次レポート（react-native-svg）、アカウント（Google連携 expo-auth-session、`poopbattler://`）、課金は IAP（RevenueCat SDK = `react-native-purchases`）。購入→RevenueCat→T-005のwebhook→`subscriptions`、native は `subscriptions` を読んで権利判定。購入復元ボタンを設ける
- 触ってよいファイル：`apps/native/src/features/{report,account,billing}/**`（billing=IAP）, 対応する `app/` 画面
- 完成の条件：T-006と同じ＋非課金時に実値がペイロード/UIに載らないテスト
- 依存：T-003, T-004, T-005

### T-008 native バトル（2D版コア）
- 種類：ui
- やること：battle-store(AsyncStorage persist)、tick駆動＋AppState復帰時の経過tick畳み込み、バトル画面、start/complete のRPC直結、expo-keep-awake、haptics。ステージは2D（PoopmFigure+Reanimated）で最小実装
- 触ってよいファイル：`apps/native/src/features/battle/**`, `apps/native/app/(tabs)/battle*`
- 完成の条件：tick畳み込み・RPC gatewayのテスト、typecheck、`expo export`
- 依存：T-002, T-004

## フェーズ3

### T-009 native 便器検出＋ガチャAR
- 種類：ui　やること：expo-camera＋検出（要技術選定。着手前に指示役が調査して人間に提示）、ガチャ演出/仲間化AR、踏ん張り(expo-sensors)　依存：T-006, T-008

### T-010 native 3D（poopm-3d）
- 種類：ui　やること：expo-gl＋R3Fで3Dステージ移植（GLBロード・テクスチャ生成の代替）。2Dと切替可能に　依存：T-008

### T-011 仕上げ
- 種類：logic　やること：EAS設定、README/`docs/native` 更新、CIにnative typecheck追加　依存：全部

## 実行順
T-001 → (T-002 ∥ T-003 ∥ T-004) → (T-005 ∥ T-006 ∥ T-008) → T-007 → T-009 → T-010 → T-011

## 人間に確認したい点
1. native のスタイリング：NativeWind か StyleSheet か（T-004 前に決めたい）
2. Expo は Expo Go 前提か、dev build（3D/便器検出は dev build 必須）か
3. T-001 は変更ファイルが非常に多い（全ファイルrename）。許容でよいか
4. iOSのみ先行か、Android も対象か（→iOS先行・dev build・StyleSheet・T-001単独先行で合意方向）
5. IAPは RevenueCat 利用でよいか（月額課金が発生しうる／自前StoreKit検証も可）
