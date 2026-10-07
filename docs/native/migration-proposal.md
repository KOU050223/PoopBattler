# RN/Expo移行後の理想アーキテクチャ提案

> 本書は [ideal-architecture.md](./ideal-architecture.md) の根拠となった提案文書。バックエンド構成（案C: Supabase直結＋Stripe系のみNext.js薄API）・3D維持・便器検出維持・課金ゲート現状同等は承認済み。
> 「要決定」マークの項目は移行時に再判断が必要な論点。
> 入力: `.orch/native-diagrams/` の現状調査メモ（T-001 battle / T-002 records / T-003 foundation、git管理外）。

RN/Expo 化で消えるもの: Server Action、Server Component、`proxy.ts`（Cookie refresh）、`next/dynamic`、`next-intl`、PWA 基盤。
残るもの: Supabase（Auth + Postgres + RLS + RPC）、Stripe、ドメインの純粋関数層。

重要な前提: **現状でもブラウザは Supabase セッションを保持している**（匿名サインインがブラウザ側で走り、`client.ts` のブラウザクライアントが存在する）。RLS による行レベル分離は既に実装上の境界であり、native が Supabase に直結しても**データ露出モデルは変わらない**。変わるのは「クライアントが Supabase を直接叩くコードを書くか」の許可リストだけ。

## 1. バックエンド構成の比較と推奨案

### 1.1 案の整理

| 案 | 構成 | 一言で |
| --- | --- | --- |
| A | native → Supabase SDK 直結。Server Action 相当は既存RPC/RLSクエリに、秘密鍵系は Supabase Edge Functions（Deno）へ | Supabase に一本化、Next.js は要らなくなる |
| B | native → 既存 Next.js API（BFF）→ Supabase | サーバー境界を一切変えない |
| C | データ面は Supabase 直結（A方式）、秘密鍵が絡む Stripe 系のみ既存 Next.js を薄い API として残す | ハイブリッド |

### 1.2 トレードオフ比較

| 観点 | A: Supabase直結+Edge Fn | B: Next BFF | C: 直結+Next薄API |
| --- | --- | --- | --- |
| セキュリティ/RLS | RLS が唯一の境界。既存ポリシーで完結（`db:test:rls` で検証済み） | RLS + API側検証の二重化。堅いが二重管理 | A と同じ。RLS は既に境界として機能している |
| Service Role Key | Edge Function の env に置く（`subscription-write` を Deno 移植） | Next サーバーの env（現状維持） | Next 側に残す（現状維持） |
| Stripe webhook | Edge Function に移植が必要。`resolveStripeEvent` は純粋関数で移植可、stripe SDK は npm: 経由か constructEventAsync 手書き検証 | 現状の `api/stripe/webhook` そのまま | 現状のまま |
| 仲間化抽選のサーバー確定性 | `complete_battle_with_symptoms` RPC が既にDB内トランザクション。**全案で同一** | 同左 | 同左 |
| 実装コスト | RPC類は流用、単純CRUDはSDK直書きで楽。一方 webhook/checkout/portal の Deno 移植 + supabase-js の RN 対応（URL polyfill、AsyncStorage セッション）が新規 | 全 Server Action を HTTP エンドポイント化 + Bearer JWT 認証基盤を新設。API仕様・エラー規約の設計が要る | RPC類・CRUDはAと同じ。Stripe系は Next API 化2エンドポイント + Bearer検証のみ |
| Web版との並走 | Web も Supabase 直結に寄せれば Next 退役可。ただし SSR/PWA の資産を捨てる | Web は現状のまま動く | Web は現状のまま動く |
| 課金ゲートの実効性 | ユーザーは自分の bowel_logs/meal_logs を RLS 越しに読める（現状も同じ）。分析集計をクライアントに置くと「レポート課金」はUI上のゲートになる | 集計をサーバーに置くと生データは握れるが、それでもユーザーは自分の行を……実はBでもAPI経由でしか渡さない設計にすれば生データ非公開にできる | Aと同じ |
| 障害・運用面 | Deno 移植で webhook の再送制御・検証を再テスト要 | 既存ハンドラそのまま。認証方式が Cookie→Bearer に増える | Stripe周りは既存動作をそのまま使う |

### 1.3 推奨案: C（Supabase直結 + Stripe系のみ既存 Next.js を薄いAPIとして残す）

理由:

- **既に適切な境界が Supabase 側にある**。start/complete battle は既に RPC 内トランザクションで確定性を持ち、meal/collection/logs のCRUDは本人行限定のRLSで済む。Server Action が担っていたのは「Supabaseクライアント生成の許可リスト」というコード上の門番であり、RLSが本質的な防御である以上、直結化で失われるセキュリティはほぼない。
- **B（全面BFF）はコストに見合わない**。12個の action を HTTP API に起こし直す設計・認証・エラー規約を新設するのに対し、得られるのは「クライアントが Supabase を見えない」だけ。RLS と RPC が既に境界を持つこのアプリでは二重投資になる。
- **A の完全版は Deno 移植コストが先行する**。Stripe webhook は署名検証・再送制御・サービスロール書き込みが絡む要所で、Web版を継続する限り Next.js はどうせ残る。Edge Function 移植は「Next.js を畳む」と決まった時点でやればよい（`resolveStripeEvent`/`subscription-write` の純粋関数は既に分離済みで、その時の移植コストは小さい）。
- **課金ゲートについて正直な注記**: 現状のティザー設計（非課金者のペイロードに実値を載せない）は「UIに出さない」レベルのゲートで、ユーザー自身の行はRSC以前から自分の権限で読める。直結化でこれが変質するわけではないが、「分析ロジック自体を秘匿したい」場合は B か、A でも `get_weekly_report` RPC/Edge Function に集計を閉じ込める選択がある。要決定。

移行パスとしての利点: C は「A のうち Stripe 系だけ先送りした形」なので、将来 Next.js 退役を決めたら残り3エンドポイントを Edge Function に移植して A に収束できる。B からの巻き戻しは二度手間になる。

### 1.4 Server Action 移行対応表（推奨案 C ベース）

| 現状の Action | 所在 | 移行先 | 方式 |
| --- | --- | --- | --- |
| `startBattleAction` | battle/actions.ts | Supabase 直結 | `supabase.rpc("start_battle")` + `user_characters`/`characters` の select（RLS本人行）+ レンタル穴埋めは `start-battle.ts` の `StartBattleGateway` を supabase-js 実装で再利用。`revalidatePath` 相当は不要（native でローカル状態更新） |
| `completeBattleAction` | battle/actions.ts | Supabase 直結 | `supabase.rpc("complete_battle_with_symptoms")` + `battle_results` 読み戻し + 件数カウント select。`isFirstCompletedBattle` の判定は共有層の純関数を流用 |
| `saveMealLogAction` | meal/actions.ts | Supabase 直結 | `from("meal_logs").insert`（RLS）。`image_path` に端末内写真IDを入れる設計はそのまま |
| `getMealLogsAction` | meal/actions.ts | Supabase 直結 | `select` + RLS |
| `replaceMealLogPhotoAction` | meal/actions.ts | Supabase 直結 | `update` + 旧 `image_path` 返却（`.select()` 付き update で同等取得） |
| `deleteMealLogAction` | meal/actions.ts | Supabase 直結 | `delete` + 旧 `image_path` 返却 |
| `getBattleHistoryAction` | bowel-log/actions.ts | Supabase 直結 | `battle_results` に `meal_logs`/`characters`/`bowel_logs` を embedded select（PostgREST のリレーション展開） |
| `getCollectionCharactersAction` | collection/actions.ts | Supabase 直結 | `user_characters` + `characters` embedded select |
| `getWeeklyReportAction` | report/actions.ts（RSC専用） | Supabase 直結 | `subscriptions` で `hasActiveEntitlement` 判定 → 課金者のみ `bowel_logs`/`meal_logs` 4週分を select → 集計は共有層の `createWeeklyReport` 系をクライアントで実行。非課金ブランチは `logged_at` のみ select する現行の列絞り込み規律を踏襲 |
| `getAccountStatusAction` | account/actions.ts | Supabase 直結 | `supabase.auth.getUser()` + 共有層 `toAccountStatus`。そもそも native では `account-watch` 相当の `onAuthStateChange` が主経路になり、初期値取得のためだけの action は要らない可能性が高い |
| `createCheckoutSessionAction` | billing/actions.ts | 既存 Next.js に新設 `POST /api/billing/checkout` | Stripe secret が要るためサーバー必須。native は `Authorization: Bearer <access_token>` を付け、Next 側で `auth.getUser(token)` 検証→本人 `subscriptions` 読取→Checkout セッションURLを返す（返却はURLのみ、native が `expo-web-browser` で開く）。App Store 課金ポリシーは §4 の要決定 |
| `createBillingPortalSessionAction` | billing/actions.ts | 既存 Next.js に新設 `POST /api/billing/portal` | 同上。customer ID は本人行から取得の現行ロジック踏襲 |

Server Action 以外のサーバー面:

| 現状 | 移行先 |
| --- | --- |
| `POST /api/stripe/webhook` | 既存 Next.js のまま（案C）。Stripe secret + service role が絡む唯一の入口 |
| `GET /auth/callback` | native 側は `expo-auth-session` + カスタムスキーム deep link で完結させ、Supabase の `signInWithOAuth`/`linkIdentity` の redirectTo を `poopbattler://auth/callback` に向ける。Web 版が残る間は現行 route も維持 |
| `src/proxy.ts`（Cookie refresh） | native には無し。supabase-js の `persistSession: true` + AsyncStorage ストレージで自動 refresh |
| `revalidatePath("/logs","/collection")` | native はキャッシュ戦略自体を持たないか、TanStack Query 等の invalidation に置き換え。直後の画面更新は mutation 結果をローカルに反映すれば足りる |
| `manifest.ts`（PWA） | `app.json`（Expo config）に置き換え |

## 2. 共有できる純粋TS層の切り出し候補

判定基準: メモ・ソース上でブラウザAPI / React / Supabase SDK（type-only import は可）に触れていないこと。

### 2.1 そのまま共有可能（環境非依存と確認済み）

battle 領域（ほぼ丸ごと共有できる。バトルロジックの共有こそが本移行の最大の利点）:

- `battle.types.ts`（type-only import のみ: bowel-log.types, database.types）
- `battle.constants.ts`（ダメージ計算・tick・属性相性）
- `battle-runtime.ts` / `battle-commands.ts` / `battle-snapshot.ts` / `battle-screen-view.ts`
- `enemy-generator.ts`（乱数注入可能な純関数）
- `rental-party.ts` / `start-battle.ts`（`StartBattleGateway` ポートを含む。gateway 実装だけ各アプリ側）
- `complete-battle-error.ts` / `post-battle-meal-session.ts` / `special-motion.ts`
- `companionship-chance.ts` / `companionship-gravity.ts` / `companionship-ar.ts`
- `toilet-detection.ts`（import なし。検出器呼出は hooks 側に分離済み）
- `components/battle-stage-motion.ts`（スナップショット差分→モーション名の状態機械）

records 領域:

- `meal/meal.types.ts`（食品群定数・バリデーション）
- `bowel-log/bowel-log.types.ts`
- `collection/character.types.ts`
- `collection/party-lineup.ts` の純粋部分（`defaultLineup`/`resolveLineup`/`swapLineupSlot`/`parsePartyLineup`）。localStorage I/O の分離が必要 → §2.2
- `report/`: `weekly-report.ts` / `report-analysis.ts` / `bowel-metrics.ts` / `report-labels.ts` / `teaser-placeholder.ts` / `report-access.ts`（すべて純粋集計）

foundation 領域:

- `account/account.types.ts`（`toAccountStatus` は構造型で User を受ける）
- `account/auth-error-messages.ts` / `callback-params.ts`
- `billing/stripe-event.ts`（`type Stripe` と `SubscriptionRecord` の type-only import。共有パッケージでは peerDependencies に型を置くか、最小構造型に書き換える）
- `lib/motion.ts` の純粋部分（`pickAcceleration`/`accelerationMagnitude`/`isStraining`/`advanceStrainAccumulation`/`inspectMotionPermission` 系。`createStrainListener` は host 注入型なので adapter 経由で再利用可）
- `i18n/config.ts` / `resolve-locale.ts`（ロケール許可リストと解決）
- `types/database.types.ts`（生成型。共有するか両アプリで別々に `supabase gen types` するかは要決定。共有が変更漏れを防げて無難）

### 2.2 分割が必要（ロジックと環境依存が混在）

| ファイル | 共有部 | 環境依存部（各アプリ側へ） |
| --- | --- | --- |
| `battle-speed.ts` | リスナー機構（素朴なSet通知） | `localStorage` 読み書き → AsyncStorage 等に差替 |
| `party-lineup.ts` | lineup 操作の純関数群 | localStorage 永続化 |
| `battle-store.ts` | persist の partialize/version/migrate は `battle-snapshot.ts` に既に分離済み | `createJSONStorage(() => sessionStorage)` → AsyncStorage。store factory として `createBattleStore(storage)` を共有層に置く案あり |
| `pwa-install.ts` | `isFirstCompletedBattle` / `shouldRememberInstallPromotionEligibility`（battle/actions が参照） | UA 判定・`installPromotionKind`・beforeinstallprompt は web 専用（native では意味を持たない） |
| `poopm/poopm.motion.ts` | ポーズの数値データ（流用の余地） | framer-motion variants 形式は DOM 専用。native 側は Reanimated/Moti に書き換え |
| `poopm/poopm.assets.ts` / `poopm-3d/poopm-3d.assets.ts` | パーツID→パスの対応表 | 解決機構が違う（`public/` URL vs `expo-asset`/require）。データ層だけ共有 |
| `poopm-3d/poopm-3d.camera.ts` / `poopm-3d.motion.ts` | カメラキュー・クリップ対応の純ロジック | 3D スタック自体を native で再現するかの判断が前提（§4 要決定） |
| `lib/ui-classes.ts` | — | Tailwind クラス。NativeWind 採用なら流用可、不採用なら再設計 |

### 2.3 共有しない（各プラットフォーム専用）

- `lib/wake-lock.ts` / `lib/user-media-camera.ts` / `meal/meal-photo-storage.ts` — 全部ブラウザAPIの薄いラッパー。native 側は別実装を用意し、**ポート（interface）を共有層に置いて注入する**
- `lib/supabase/{client,server,proxy}.ts` — native 用の supabase-js クライアント生成（AsyncStorage persist）は別物。ただし `anonymous-session.ts` / `account-watch.ts` / `google-identity.ts` / `sign-out.ts` / `auth-callback.ts` は **最小 auth インターフェース注入の DI 設計になっている**ため、ロジックは共有層へ寄せられる余地が高い（redirectTo 組み立て部分だけ分岐）
- UIコンポーネント全般、`next-intl` 配線（`i18n/request.ts`）、`app/` 配下

### 2.4 monorepo 配置案

現状 npm（package-lock、workspaces 未使用）のため、**npm workspaces** または pnpm 移行 + Turborepo が自然。最小構成:

```
poop-battler/
  apps/
    web/        # 現行 Next.js（src/ をそのまま移行）
    native/     # 新規 Expo app（expo-router）
  packages/
    domain/     # @poopbattler/domain — 依存ゼロの純TS。
                #   battle/ records/ account/ billing(stripe-event)/ motion-math/
                #   types/database.types.ts
                #   ports.ts（KeyValueStorage / PhotoStore / CameraStream 等のinterface）
    i18n/       # messages/*.json の共有（next-intl と i18next の両方で読める形。補間構文の差に注意）
  (web側 adapters: localStorage/sessionStorage/IndexedDB 実装)
  (native側 adapters: AsyncStorage/expo-file-system/expo-camera 実装)
```

設計方針: **ドメイン層はポートを定義し、ストレージ・カメラ・時計は注入する**。現状の `StartBattleGateway` / `AnonymousSessionAuth` / `StrainListenerHost` の DI パターンをそのまま全境界に広げる形。テスト（Vitest）は `packages/domain` で無改造のまま動く。

## 3. ブラウザAPI → Expo/React Native 置き換え表

| 現状のAPI/依存 | 所在 | Expo/RN 代替 | 備考 |
| --- | --- | --- | --- |
| `navigator.mediaDevices.getUserMedia` | `lib/user-media-camera`（食事撮影・ガチャAR） | `expo-camera`（`CameraView`） | 権限モデルは `requestCameraPermissionsAsync`。insecure/denied/busy の状態機械を native 権限に写し替え。背面優先は `facing="back"` |
| `DeviceMotionEvent.requestPermission` / `devicemotion` | `lib/motion`（踏ん張り）、`use-gravity-floor`、`title-shake` | `expo-sensors`（`DeviceMotion` / `Accelerometer`） | native では加速度計に権限ダイアログが要らないため `MotionPermission` の「prompt」経路は消える。踏ん張り積算の純ロジックは共有層へ |
| `navigator.wakeLock` | `lib/wake-lock` | `expo-keep-awake`（`useKeepAwake`） | バトル中だけ有効化する方針は同じ |
| IndexedDB（`poop-battler`/`meal-photos`） | `meal/meal-photo-storage` | `expo-file-system`（`documentDirectory` に JPEG 保存） | `image_path=UUID` 設計は流用可。ID→ファイルパスの対応を PhotoStore ポートで吸収 |
| localStorage（party-lineup / battle-speed / pwa-*） | `party-lineup.ts`、`battle-speed.ts`、`pwa-install-promotion` | `@react-native-async-storage/async-storage`（または `expo-sqlite` の kv-store / `react-native-mmkv`） | Zustand persist の storage 差替でも吸収可。`pwa-*` キーは native では概念自体が消える |
| sessionStorage（battle persist） | `stores/battle-store` | AsyncStorage（persist継続）or メモリのみ | 現行の「セッションだけ持つ」意味付けは native ではアプリプロセス寿命に相当。kill/再起動後に復旧できる方がUX的に有利なので persist 継続を推奨 |
| `<canvas>` toBlob / `URL.createObjectURL` | `meal-photo-picker`、3D影・テクスチャ生成 | `CameraView.takePictureAsync`（JPEG直接）、`expo-file-system` 経由の file:// URI を `<Image>` へ | Canvas2D による動的テクスチャ生成は 3D スタック決定次第（expo-gl では代替手法が要る） |
| `beforeinstallprompt` / `appinstalled` / display-mode | `pwa-install-provider` | 不要 | native ではインストール案内の概念がない。App Store レビュー依頼（`expo-store-review`）への転用は別途検討 |
| `@tensorflow/tfjs` + coco-ssd（便器検出） | `use-toilet-detection` | 要決定: ① `tfjs-react-native`（expo-gl 依存、メンテ実績に注意）② `react-native-vision-camera` フレームプロセッサ + ML Kit/TFLite ③ 検出を捨て手動照準UIに簡素化 | 重い依存。ガチャ演出の価値対コストを見て判断（§4） |
| three / `@react-three/fiber` / drei / WebGL | `features/poopm-3d` 全体 | 要決定: ① `expo-gl` + three.js + R3F（RN 対応はあるが GLB ロード・テクスチャ・シェーダーの移植コスト大）② 3D を諦めて 2D（PNG パーツ + Reanimated/Skia）に設計変更 | `useGLTF`/`SkeletonUtils` の代替が鍵。2D化はアート方向の決定を伴う（§4） |
| `next-intl` | `i18n/` 全体 | `i18next` + `react-i18next` + `expo-localization` | `messages/ja.json`/`en.json` を packages/i18n で共有。補間構文の差分（ICU vs i18next形式）の揃えが要る |
| Stripe Checkout/Portal への `window.location.assign` | `purchase-call-to-action`、`manage-subscription-link` | `expo-web-browser` の `openAuthSessionAsync` / `WebBrowser.openBrowserAsync` で Checkout URL を開き deep link で復帰 | **App Store ガイドライン3.1.1 のリスクあり**（デジタル機能の外部決済）。IAP（StoreKit / `expo-iap` / RevenueCat）への切替検討が要る（§4） |
| `new Audio()` / `navigator.vibrate` | `title-shake-surprise` | `expo-audio` / `expo-haptics` | |
| `<input type=file>` | `meal-photo-picker`、差替UI | `expo-image-picker` | |
| Pointer Events（ARスワイプ） | `companionship-ar-stage` | `react-native-gesture-handler`（PanResponder） | スワイプ判定 `isThrowSwipe` 自体は共有層の純関数 |
| `window.confirm` / `window.location` / `router.refresh` | 各所 | `Alert.alert` / expo-router の `router` / ローカル状態リセット | |
| `crypto.randomUUID` | `saveMealPhoto` | `expo-crypto` の `Crypto.randomUUID()` または `react-native-get-random-values` | Hermes の対応バージョンに依存 |
| Cookie セッション / `proxy.ts` updateSession | 認証基盤 | supabase-js + AsyncStorage（`persistSession`）でトークン自動更新 | Cookie が存在しないため proxy 相当は不要 |
| OAuth `/auth/callback` | `auth-callback.ts` + route | `expo-auth-session` + カスタムスキーム（`poopbattler://`） | `exchangeCodeForSession` 呼出は共有層で再利用可 |
| `next/navigation` / RSC / `next/dynamic` | app/ 全体 | `expo-router`（ファイルベース） | RSC がないため初期データは screen 側で fetch + Suspense。ssr:false ラッパーは不要になる |
| `matchMedia` | pwa provider | `react-native` の `Appearance` / `useColorScheme` | pwa 判定用途なら実質不要 |
| SVG チャート（DOM直書き） | `report/charts` | `react-native-svg`（近い API で移植しやすい）or Skia | 集計ロジックは共有層のため描画だけ再実装 |
| `next/image` | 各所 | `expo-image` | |
| `next/font`（Nunito） | layout | `expo-font`（`useFonts`） | |
| `NEXT_PUBLIC_*` env | `lib/supabase/env` | `EXPO_PUBLIC_*` | anon key はアプリに同梱される設計は同じ（RLS が境界） |
| `setInterval` tick 駆動 | `battle-screen` | 同じ JS タイマーだが、native はバックグラウンドでサスペンド | `AppState` で戦闘の一時停止/再開を設計に入れる。sessionStorage persist 相当の復元設計が活きる |
| `window.isSecureContext` | `user-media-camera` | 常にtrue相当 | native の insecure 分岐は消える |
| Service Worker / manifest | PWA基盤 | 不要（app.json + EAS Build） | |
| Tailwind | `ui-classes.ts` 等 | `nativewind`（採用するなら）or StyleSheet 再設計 | 採用是非は UI 実装フェーズの決定事項 |

## 4. 要決定事項・リスク

- **Stripe in-app**: 週次レポート課金をアプリ内で外部 Stripe に流すと App Store 審査で却下リスク（ガイドライン3.1.1）。IAP（`expo-iap`/RevenueCat）に切り替えると webhook→subscriptions 書込み経路も StoreKit Server Notifications に作り替えになる。日本のスマホ競争促進法で外部決済の余地は広がっているが、リリース時点のポリシー確認が必須。
- **3D 描画**: expo-gl + R3F 移植 vs 2D 化。`poopm-3d` は見た目の資産価値が高い一方で移植コストも最大。最初の native 版では 2D（`PoopmFigure` + Reanimated）で出し、3D は後追い、も選択肢。
- **便器検出**: coco-ssd の RN 移植は実績が薄い。検出なしの「手動照準 + 投げ入れ演出」への機能簡素化も検討。
- **レポート課金ゲートの実効性**: §1.3 注記の通り、直結化で生データが読めるのは現状と同じ。分析そのものを秘匿したいなら `get_weekly_report` RPC / Edge Function に集計を閉じ込める案がある（その場合 `createWeeklyReport` 系はサーバー/DB側で動かす）。
- **バトルのバックグラウンド遷移**: tick が止まるため、復帰時に経過分をまとめて進めるか一時停止扱いにするかの設計が要る（`applyBattleTick` が純関数なので「経過tick分を畳み込む」実装は容易）。
- **`isFirstCompletedBattle` のPWA依存分離**: battle/actions が pwa-install.ts の関数を import している現状は、共有層では pwa 系ロジックから切り離す。
