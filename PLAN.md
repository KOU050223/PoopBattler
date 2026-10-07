# PLAN: PoopBattler Native化（Expo / 案C）

統合ブランチ: `orch/native-app`
仕様の正本: **`docs/web-spec.md`**（現行Webの振る舞い。Nativeの実装はこれに合わせる。判断に迷ったらここを参照し、specにない差異を勝手に作らない）
方針の根拠: `docs/native/migration-proposal.md`, `docs/native/ideal-architecture.md`（承認済み: 案C・3D維持・便器検出維持・課金ゲート現状同等）
検証の限界: Expo実機/シミュレータでの見た目は指示役が確認できない。native UIタスクは `needs-human-review` で止める。自動判定は typecheck / vitest / `expo export` で行う。

## 共通の完成条件（全タスク）
- `npm run typecheck`, `npm test`, `npm run lint` が通る
- Webの既存テストを消さない・緩めない
- 仕様は `docs/web-spec.md` を正本とする。特に以下は合わせること：
  - 仲間化確率（食事ログ 0件=0% / 1件=50% / 2件=75% / 3件=85% / 4件以上=90%、サーバー判定）
  - 敗北時はサーバーのバトル行がactive残り＝次の開始で同じ敵・同じparty_snapshotを再開
  - 排便ログは勝利後の完了フローでのみ記録
  - パーティ3値はクライアントから送らずサーバーが確定

## 完了済み（詳細は PROGRESS.md）

| ID | 内容 | 状態 |
| --- | --- | --- |
| T-001 | npm workspaces化 | completed |
| T-002/002a/002b | domain battle純粋層 | completed |
| T-003 | domain records/report/account等 | completed |
| T-004 | apps/native スキャフォールド | completed（human-review通過） |
| T-006 | native 記録系（meal/bowel/collection/パーティ編成） | completed |
| T-008 | native バトル2Dコア（tick・RPC・haptics・keep-awake） | completed |

## 残タスク

### T-012 native バトル完了フローの仕様追従
- 種類：ui
- 背景：web-specと比較して完了フローに3つの欠落がある。①開始時に `userCharacterIds: []` 固定で送っており、コレクションで編成したパーティが使われない ②勝利後の食事記録セッションが無く `meal_log_id` が常にnull（ガチャの投げ入れ演出の種になる値）③排便フォームに症状（symptoms）入力が無い（gatewayの `p_symptoms` は対応済み）
- やること：①開始時に `loadPartyLineup` + `lineupOwnedIds` で編成を送る（未編成は空配列＝新しい順自動選択のまま）②完了フローに食事セッションのステップを追加。domainの `mealLogIdForComplete` / `postBattleMealChanceCopy` を再利用して確率案内を表示 ③排便フォームに症状の複数選択を追加
- 触ってよいファイル：`apps/native/src/features/battle/**`, `apps/native/src/features/meal/**`, `apps/native/src/features/collection/party-lineup-storage.ts`, `apps/native/src/i18n/**`
- 完成の条件：編成→開始で `p_user_character_ids` に編成IDが載る・食事セッション保存後に `p_meal_log_id` が送られる・症状が送られる、をvitestで確認。`npm run typecheck`、`npx expo export -w apps/native`（or該当スクリプト）
- 見た目の条件：コレクションで編成→バトル→勝利→排便4項目＋症状→食事セッション（確率コピー表示）→結果
- 依存：T-006, T-008（完了済み）
- 状態：needs-human-review（マージ済。見た目の条件で人間確認待ち）

### T-013b `_layout.tsx` typecheckエラー修正（T-013から分割）
- 種類：logic
- やること：`app/(tabs)/_layout.tsx` の `fontFamily`/`backgroundColor` 型エラー2件を修正してnative typecheckを0エラーに（ピッカー側はT-013本体で扱う）
- 触ってよいファイル：`apps/native/src/app/**` のみ
- 完成の条件：`npm run typecheck -w apps/native` が0エラー、`npm test -w apps/native` 通過
- 依存：なし（`app/**` のみでT-012と非衝突のため並列）
- 状態：completed（差し戻し後に修正・マージ済 7416805。統合ブランチtypecheck 0エラー）

### T-013 写真ピッカー不具合対応＋既知typecheckエラー
- 種類：logic
- 背景：ごはん記録Modal内からのexpo-image-pickerがiOS 26で閉じない不具合。`meal-photo-picker.ts` に `presentationStyle: FULL_SCREEN` を入れた暫定修正はコミット済みだが実機未確認。別件で `app/(tabs)/_layout.tsx` にstyle型エラー2件が残っている
- やること：①FULL_SCREEN修正をシミュレータで再現確認。閉じない場合はRN `Modal`（pageSheet）内からの起動をやめ、フォームをModal以外で表示するかピッカーをModal外から起動する構造に変更 ②`_layout.tsx` の `fontFamily`/`backgroundColor` 型エラーを修正してnative typecheckを0エラーに
- 触ってよいファイル：`apps/native/src/features/meal/**`, `apps/native/src/app/**`
- 完成の条件：`npm run typecheck -w apps/native` が0エラー。写真選択→確定→フォームに戻ることを確認（構造変更した場合はシミュレータ手動確認または実機レビュー依頼）
- 依存：なし。**T-012と `features/meal/**` が被るため同時には振らない**
- 状態：保留（②はT-013bへ分割済み。①は人間の実機確認次第）

### T-005 アプリ内課金（IAP）の権利付与バックエンド
- 種類：logic（決済・DBスキーマ・権限 → 着手前に人間承認、最終レビュー必須）
- 方針：native は **IAP のみ**（Stripe を native から呼ばない）。Web版の Stripe は現状維持。権利の正は `subscriptions`（`hasActiveEntitlement`）に一本化
- やること：①`subscriptions` に提供元(`provider`: stripe|apple)と外部ID列を足す migration（ファイル作成のみ・適用しない）②RevenueCat webhook を受ける `POST /api/iap/webhook`（共有シークレット検証・service role で `subscription-write`）③型再生成・RLSテスト追加。`resolveStripeEvent` 相当の純関数 `resolveIapEvent` を domain に置きテスト
- 触ってよいファイル：`supabase/migrations/**`, `apps/web/src/app/api/iap/**`, `apps/web/src/features/billing/**`, `packages/domain/billing/**`, `apps/web/src/types/database.types.ts`
- 完成の条件：vitestで 署名/シークレット不正は拒否・購入/更新/期限切れ/返金の各イベントでsubscriptions状態が正しく遷移・他人の行を書けない、`db:test:rls`、全テスト通過
- 依存：T-003
- 状態：**blocked（RevenueCat利用の人間承認待ち）**

### T-007 native レポート/アカウント/課金
- 種類：ui（課金・認証 → 最終レビュー必須）
- 仕様（web-spec準拠）：週次レポートはJST月曜始まり。未課金はティーザー（実数値のみ・分析はプレースホルダー、CSS隠しでは読める設計にしない）。課金はStripeサブスクではなくIAP。購入復元ボタン必須
- やること：週次レポート（react-native-svg）、アカウント（Google連携 expo-auth-session、`poopbattler://`）、IAP（RevenueCat SDK = `react-native-purchases`）。購入→RevenueCat→T-005のwebhook→`subscriptions`、native は `subscriptions` を読んで権利判定
- 触ってよいファイル：`apps/native/src/features/{report,account,billing}/**`、対応する `app/` 画面
- 完成の条件：native側vitestでgateway/アダプタのテスト、typecheck、`expo export`＋**非課金時に実値がペイロード/UIに載らないテスト**
- 依存：T-003, T-004, T-005
- 状態：pending

### T-009 native 便器検出＋ガチャAR
- 種類：ui
- 仕様（web-spec準拠）：仲間化成功時のみ、ステージ遷移 `staging → throw → shake → reveal → summary`。staging=カメラプレビュー＋便器検出、throw=食事写真の投げ入れ（`meal_log_id` の写真をPhotoStoreから）、shake=揺れ演出、reveal=キャラ出現、summary=獲得結果。カメラ権限拒否/非対応は3Dのみにフォールバック、`prefers-reduced-motion` 相当ではthrow/shake省略、スキップボタン常設
- やること：expo-camera＋検出（要技術選定。webはcoco-ssd。nativeの検出手法は**着手前に指示役が調査して人間に提示**）、ガチャ演出、踏ん張り(expo-sensors)
- 触ってよいファイル：`apps/native/src/features/battle/**`（AR/gacha系新規サブディレクトリ）, `apps/native/src/features/meal/**`（写真取得）
- 完成の条件：typecheck、`expo export`、ステートマシンのvitest
- 依存：T-006, T-008, T-012（meal_log_idと写真を使うため）
- 状態：pending

### T-010a native 3D基盤（expo-gl + three + R3F 導入・GLBロードPoC）
- 種類：logic
- 背景：docs/native/ideal-architecture.md で expo-gl+three+R3F 移植が承認済み。「GLB1体+影のPoCを早期に、camera/motion純ロジックを先に切り出す」推奨に沿い、T-010を基盤（本タスク）とステージ統合（T-010b）に分割
- やること：①apps/nativeに expo-gl/three(0.185.1揃え)/@react-three/fiber(RN対応版)/@types/three を追加（dreiは入れない）②metro.config.jsのassetExtsにglb追加 ③`src/features/poopm-3d/` を新設しwebの motion/camera/assets を移植（assetsはwebのGLB/PNGを相対require、poopm-images.tsと同じ方式）④GLTFLoader.parse+expo-file-system によるGLBローダー（fetch/file://を使わない）⑤R3F Canvasでpoopm_base.glb 1体描画する検証用コンポーネント（画面非接続）⑥純ロジックのvitest
- 触ってよいファイル：`apps/native/package.json`, `apps/native/metro.config.js`, `apps/native/src/features/poopm-3d/**`, `apps/native/vitest.config.mts`, ルート `package-lock.json`
- 完成の条件：`npm run typecheck -w apps/native` 0エラー、`npm test -w apps/native` 通過、ルート typecheck/test 維持、`npx expo export` ios+android 成功（GLBがバンドル解決されること）
- 依存：T-008
- 状態：completed（指示役検証で全合格・マージ済。実機でのGLB描画はT-010bで確認）

### T-010b native 3Dステージ統合（poopm-3d）
- 種類：ui
- 仕様（web-spec準拠）：3Dが使われるのはバトルステージ・ガチャ・結果フィギュア・プーモン演出。コレクション一覧/履歴/タイトルは2Dのまま
- やること：T-010aの基盤上に web の poopm-3d components（model/field/camera-rig/stage/solo/blob-shadow/figure）と battle-stage-motion.ts を移植し、バトルステージを3D化。2D/3Dを切替可能に（battle-speed-storage と同様に永続化）。結果フィギュアも3D化。ガチャARはT-009の範囲で触らない
- 触ってよいファイル：`apps/native/src/features/poopm-3d/**`, `apps/native/src/features/battle/**`, `apps/native/src/i18n/**`
- 完成の条件：typecheck、`expo export`、stage-motionと切替のvitest
- 依存：T-010a（ガチャ3DはT-009側。T-009の前に入れてガチャを3Dで作る流れにする）
- 状態：needs-human-review（マージ済 f599da9。実機/シミュレータで3D描画・モーション・切替・結果フィギュアの確認待ち）

### T-011 仕上げ
- 種類：logic
- やること：EAS設定、README/`docs/native` 更新、CIにnative typecheck/test/export追加、`docs/web-spec.md` とnativeの差分の最終照合
- 依存：全部
- 状態：pending

## 実行順

```
即着手可: T-010a → T-010b（逐次）
承認待ち: T-005 → T-007／T-013（実機確認待ち）
後続:     T-009 → T-011
```

## 人間に確認したい点
1. T-005: IAPにRevenueCatを使ってよいか（月額課金が発生しうる／自前StoreKit検証も可）— 承認待ちのまま
2. T-013: FULL_SCREEN修正が実機で効いたか。効いていれば構造変更は不要
3. T-009の便器検出手法（nativeでcoco-ssd相当を何でやるか）は着手時に調査結果を提示する
