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
- 状態：**completed（①は人間が実機で修正の動作を確認済み。②はT-013bで解消済み）**

### T-005 アプリ内課金（IAP）の権利付与バックエンド
- 種類：logic（決済・DBスキーマ・権限 → 着手前に人間承認、最終レビュー必須）
- 方針：native は **IAP のみ**（Stripe を native から呼ばない）。Web版の Stripe は現状維持。権利の正は `subscriptions`（`hasActiveEntitlement`）に一本化
- やること：①`subscriptions` に提供元(`provider`: stripe|apple)と外部ID列を足す migration（ファイル作成のみ・適用しない）②RevenueCat webhook を受ける `POST /api/iap/webhook`（共有シークレット検証・service role で `subscription-write`）③型再生成・RLSテスト追加。`resolveStripeEvent` 相当の純関数 `resolveIapEvent` を domain に置きテスト
- 触ってよいファイル：`supabase/migrations/**`（新規追加のみ・適用はローカルのみ可）, `apps/web/src/app/api/iap/**`, `apps/web/src/features/billing/**`, `apps/web/src/lib/supabase/subscription-write.ts`, `packages/domain/src/billing/**`, `packages/domain/src/types/database.types.ts`, `scripts/sql/rls-verify.sql`
- 完成の条件：vitestで 署名/シークレット不正は拒否・購入/更新/期限切れ/返金の各イベントでsubscriptions状態が正しく遷移・他人の行を書けない、`db:test:rls`、全テスト通過
- 依存：T-003
- 状態：**completed**（マージ済 `7c5f397` / merge `80fa900`。レビュー指摘5件は T-005-fix1 で修正済み、指示役再検証で全合格）

### T-005-fix1 IAP webhook レビュー指摘の修正
- 種類：logic（決済・権限のため修正後も最終レビュー相当の確認を行う）
- やること：最終レビュー指摘5件の修正。①upsertにlast_event_at順序ガード（遅延INITIAL_PURCHASEで失効権利が復活しない）②TRANSFER対応（transferred_from行削除＋upsert時の別ユーザーtx_id衝突防御）③provider切替時のID null化をやめ、更新突合にprovider条件を追加（二重課金・解約手段消失の防止）④NON_RENEWING_PURCHASEをignoreへ⑤apple行向けエラーメッセージ修正
- 触ってよいファイル：.orch/t005-fix1-spec.md 記載の範囲
- 完成の条件：specの検証コマンド全通過＋陽性/陰性を同一実行で検査
- 依存：T-005の未コミット差分（同worktree）
- 状態：completed（指示役再検証: typecheck 0・web335+domain260+native140・db:types:check一致・RLS全OK含むapple行）

### T-007 native レポート/アカウント/課金
- 種類：ui（課金・認証 → 最終レビュー必須）
- 仕様（web-spec準拠）：週次レポートはJST月曜始まり。未課金はティーザー（実数値のみ・分析はプレースホルダー、CSS隠しでは読める設計にしない）。課金はStripeサブスクではなくIAP。購入復元ボタン必須
- やること：週次レポート（react-native-svg）、アカウント（Google連携 expo-auth-session、`poopbattler://`）、IAP（RevenueCat SDK = `react-native-purchases`）。購入→RevenueCat→T-005のwebhook→`subscriptions`、native は `subscriptions` を読んで権利判定
- 触ってよいファイル：`apps/native/src/features/{report,account,billing}/**`、対応する `app/` 画面
- 完成の条件：native側vitestでgateway/アダプタのテスト、typecheck、`expo export`＋**非課金時に実値がペイロード/UIに載らないテスト**
- 依存：T-003, T-004, T-005
- 状態：dispatched（ctx_8e5a0ccc7d51 / worktree t007-native-report-iap）

### T-009a native 便器検出基盤（vision-camera + fast-tflite）
- 種類：logic
- 背景：便器検出の方式は人間が **A案（`react-native-vision-camera` + `react-native-fast-tflite` + `vision-camera-resize-plugin` + COCO系TFLiteモデル同梱）** を選択済み（B案=手動照準、C案=tfjs-react-nativeは不採用）
- やること：①3パッケージ＋必要な関連依存（worklets等）をapps/nativeに追加・Expo config plugin配線（カメラ権限文面はja/en想定・NSCameraUsageDescription）②COCO互換・`toilet`ラベル入りの軽量TFLite検出モデルをassetsに同梱（取得元URLとライセンスを報告に記載）③webの `use-toilet-detection`/`use-gacha-camera` と domain `battle/toilet-detection.ts` を読み、検出結果→判定（検出中/見つかった/タイムアウト→フォールバック）の純ロジックを native 側に切り出す④frame processor で推論する検出フック＋カメラプレビューPoCコンポーネント（画面非接続）⑤純ロジックのvitest
- 触ってよいファイル：`apps/native/**`（src・app.json等config含む）、ルート `package-lock.json`。`packages/domain/` は読むだけ（変更したくなったらask）
- 完成の条件：typecheck、`npm test -w apps/native`（検出判定ロジックのテスト含む）、`npx expo export` 成功（モデルがasset解決されること）、`npx expo prebuild --clean` が通ること（config plugin検証）
- 依存：T-012（完了フロー確定済み）
- 状態：completed（マージ済 a8eca4c。実機での検出動作確認はT-009bの人間レビューで行う）

### T-009b native ガチャAR統合
- 種類：ui
- 仕様（web-spec準拠）：仲間化成功時のみ、ステージ遷移 `staging → throw → shake → reveal → summary`。staging=T-009aのカメラプレビュー＋便器検出、throw=食事写真の投げ入れ（`meal_log_id` の写真をPhotoStoreから）、shake=揺れ演出、reveal=キャラ出現（T-010bのpoopm-3dコンポーネント利用）、summary=獲得結果。カメラ権限拒否/非対応は3Dのみにフォールバック、reduce-motionではthrow/shake省略、スキップボタン常設
- やること：webの `companionship-ar-stage.tsx`/`gacha-stage-3d.tsx`/`poopm-3d-gacha.tsx` と domain `companionship-ar.ts` を移植し、完了フローにARステージを組み込む。踏ん張り入力は expo-sensors（webの device-motion 相当）
- 触ってよいファイル：`apps/native/src/features/battle/**`（AR/gacha系新規サブディレクトリ）, `apps/native/src/features/meal/**`（写真取得）, `apps/native/src/features/poopm-3d/**`, `apps/native/src/i18n/**`
- 完成の条件：typecheck、`expo export`、ガチャステートマシンのvitest
- 依存：T-009a, T-010b
- 状態：needs-human-review（マージ済 `b4c601c` / merge `34d1e23`。指示役検証: typecheck 0・native166tests(+16)・export iosでtflite+GLB全バンドル。実機でのAR動作・便器検出・重力連動の確認待ち）

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
即着手可: T-007（T-005マージ済みで解除）
後続:     T-011（全タスク後）
人間確認待ち: T-009b, T-010b, T-012, T-004, T-006, T-008
```

## 人間に確認したい点
1. ~~T-005: IAPにRevenueCatを使ってよいか~~ → 承認済み・実装マージ済
2. ~~T-013: FULL_SCREEN修正が実機で効いたか~~ → 実機確認済み・completed
3. ~~T-009の便器検出手法~~ → A案選択済み・T-009a/b実装済
4. T-007のRevenueCat SDK導入に先立ち、人間側でRevenueCatダッシュボードの設定（プロジェクト・entitlement・商品・webhook共有シークレット）が必要。コード側はダミーキーで進められる
