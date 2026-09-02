# PooPBattler アーキテクチャ

## 方針

ハッカソンでは、ネイティブアプリや独自バックエンドを作らず、モバイルWebで「揺らして戦う → 排便ログを残す → 仲間になる」体験を完成させることを優先する。

- フロントエンドとサーバー処理は **Next.js App Router** に集約する。
- 認証、データベース、画像保存は **Supabase** をBaaSとして利用する。
- バトル中の状態はブラウザ内で管理し、終了時の結果だけを保存する。
- 敵の出現と仲間化の抽選はServer Actionで確定し、クライアントは抽選結果を決めない。
- 本格ARではなく、カメラ映像にキャラクターを重ねるAR風演出にする。

## 技術スタック

| 領域 | 技術 | 用途 |
| --- | --- | --- |
| Webアプリ | Next.js + TypeScript | App Router、画面、Server Actions |
| UI | Tailwind CSS + shadcn/ui | 画面構築と共通UI |
| アニメーション | Framer Motion | 攻撃、ダメージ、撃破、仲間化演出 |
| センサー | `DeviceMotionEvent` | 加速度を使った攻撃判定 |
| カメラ | `getUserMedia()` | 食事写真撮影、AR風イベント |
| 認証・DB・画像 | Supabase | 匿名ログイン、Postgres、Storage |
| 一時状態 | Zustand + `persist` | バトル中のHP、コンボ、ゲージ、リロード復元用の下書き |
| デプロイ | Vercel | HTTPSでの公開と実機デモ |

## 実装する体験

1. 食事写真を撮影して保存する。
2. 直近の食事ログを基に、敵の属性をServer Actionで決定する（例：カレー → カレー属性）。
3. バトルを開始し、モーション利用の許可を取得する。
4. 端末の揺れがしきい値を超えたら敵にダメージを与える。
5. 撃破後に便の硬さ・量・色・出しやすさを選択する。
6. Server Actionが仲間化を抽選・保存し、カメラ画面上で結果を演出する。
7. 図鑑で取得キャラクターと過去ログを確認する。

## MVPでは実装しないもの

- ARKit / ARCoreによる便器の平面認識
- 食事写真のAI栄養解析
- ユーザー間交換、PvP、マーケット
- 課金、プレミアム分析、プッシュ通知
- 医学的な判定や健康診断機能

## ディレクトリ構成

```text
src/
├─ app/
│  ├─ (app)/
│  │  ├─ battle/page.tsx
│  │  ├─ meals/page.tsx
│  │  ├─ logs/page.tsx
│  │  └─ collection/page.tsx
│  ├─ api/                 # Webhookなど、HTTP APIが必要なものだけ
│  ├─ layout.tsx
│  └─ page.tsx
├─ proxy.ts                 # SupabaseセッションCookieの更新
│
├─ features/
│  ├─ battle/
│  │  ├─ components/
│  │  ├─ hooks/
│  │  ├─ actions.ts
│  │  ├─ battle.constants.ts
│  │  ├─ enemy-generator.ts
│  │  └─ battle.types.ts
│  ├─ meal/
│  │  ├─ components/
│  │  ├─ actions.ts
│  │  └─ meal.types.ts
│  ├─ bowel-log/
│  │  ├─ components/
│  │  ├─ actions.ts
│  │  └─ bowel-log.types.ts
│  └─ collection/
│     ├─ components/
│     ├─ actions.ts
│     └─ character.types.ts
│
├─ components/
│  ├─ ui/                  # 汎用UIのみ
│  └─ layout/
│
├─ lib/
│  ├─ supabase/
│  │  ├─ client.ts         # ブラウザ用クライアント
│  │  ├─ server.ts         # Server Component / Server Action用
│  │  └─ proxy.ts          # セッション更新処理本体
│  ├─ motion.ts            # 権限・対応状況・加速度取得を扱うラッパー
│  ├─ wake-lock.ts         # 画面スリープ抑止のベストエフォート処理
│  └─ utils.ts
│
├─ stores/
│  └─ battle-store.ts
│
└─ types/
   └─ database.types.ts    # Supabaseスキーマから生成
```

## 責務のルール

1. `app/` にはルーティングと画面の組み立てだけを書く。ゲーム・DBのロジックを書かない。
2. 機能に固有のコードは必ず `features/<機能名>/` に置く。
3. Supabaseへのアクセスは `features/<機能名>/actions.ts` または `lib/supabase/` に限定する。
   Supabaseクライアントを生成してよいのは次の場所だけで、これは ESLint の
   `no-restricted-imports` で強制している。

   | 場所 | 使うクライアント |
   | --- | --- |
   | `features/<機能名>/actions.ts` | `lib/supabase/server.ts`（Server Action） |
   | `lib/supabase/` | 各クライアントの実装本体 |
   | `proxy.ts` | `lib/supabase/proxy.ts`（セッション更新） |

   lintは **`src/` 全体を既定で禁止し、上の表の3か所だけを解除する**許可リスト方式。
   禁止リスト方式にすると、`stores/` や `features/*/` 直下のような後から増えた
   場所が黙って穴になるため。塞いでいるのは次の経路。

   - `lib/supabase/client` `lib/supabase/server`（エイリアス・相対パスの双方）
   - 生のSDK（`@supabase/ssr`、`@supabase/supabase-js`）からの直接生成
   - 上記いずれかの動的import（`no-restricted-imports` は `import()` を見ないため、
     `no-restricted-syntax` で別途塞ぐ）

   UIは Server Component から渡されたデータか、`features/<機能名>/actions.ts` の
   Server Actionだけを呼ぶ。

   認証もこの規則の例外にしない。匿名サインインは
   `lib/supabase/anonymous-session.ts` の `signInAnonymouslyFromBrowser()` が
   クライアントの生成を内側に閉じ込め、UIには結果だけを返す。DB操作が可能な
   クライアントをコンポーネントへ渡さないことで、境界にlint抑制を置かずに済む。
4. バトル中のHP、コンボ、ゲージ、センサー値は Zustand でローカル管理する。`persist` で未完了バトルを `sessionStorage` に復元可能にし、Supabaseには確定結果だけを保存する。
5. 共通化できないコンポーネントを `components/` に置かない。機能固有のものは各 `features/` の配下に置く。
6. 環境変数とService Role Keyはクライアントへ公開しない。秘密鍵を要する処理はServer ActionまたはRoute Handlerに置く。
7. 個人データを持つ全テーブルでRLSを有効化し、`auth.uid() = user_id` を基本ポリシーにする。マスターの `characters` は読み取り専用、更新はサーバー処理に限定する。
8. 食事画像は非公開Storageバケットに置き、本人のオブジェクトだけをRLSで許可する。画面表示には短期限の署名URLを発行する。

## センサー・画面状態の扱い

- `lib/motion.ts` は `DeviceMotionEvent.requestPermission()` をユーザーが押した開始ボタン内で呼び出す。`granted`、`denied`、未対応の状態を画面へ返し、利用不可時は「攻撃」ボタンへフォールバックする。
- モーションAPIとカメラはHTTPS環境でのみ利用する。実機検証はVercel Preview DeploymentまたはHTTPSトンネルを使い、端末からローカルHTTPサーバーへ直接アクセスしない。
- `lib/wake-lock.ts` はバトル中だけScreen Wake Lockを要求し、非対応・拒否時は何もしない。画面が再表示されたときのみ再取得を試み、撃破・離脱時に必ず解放する。
- バトルの永続化対象は、敵ID、敵HP、累計ダメージ、開始時刻、完了前の入力内容だけとする。センサーの生データは保存しない。

## 敵生成・仲間化の確定

`features/battle/enemy-generator.ts` は、直近の `meal_logs` のタグまたは料理名から敵属性を決定する。AI画像解析は行わず、食事登録時に選ぶ簡易タグを使う。

1. `startBattleAction` が敵属性・敵キャラクターを決め、所有者付きの `battle_results` を `active` 状態で作成する。
2. クライアントはローカルでバトル演出とダメージ計算を行う。
3. `completeBattleAction` は対象のバトルが本人の `active` レコードであることを確認し、サーバー側の乱数で仲間化を一度だけ抽選する。
4. 抽選結果、排便ログ、取得キャラクターをトランザクションで紐付けて確定する。

これは不正耐性を最小限に保つための設計であり、ハッカソンMVPでは連打・自動化への高度な対策は行わない。

## データモデル（最小）

| テーブル | 主な内容 |
| --- | --- |
| `profiles` | `id → auth.users.id`。匿名ログイン直後にDBトリガーで作成するプロフィール |
| `meal_logs` | `user_id → profiles.id`、食事日時、画像パス、料理タグ、任意メモ |
| `bowel_logs` | `user_id → profiles.id`、`battle_result_id → battle_results.id`（一意）、硬さ、量、色、出しやすさ、記録日時 |
| `characters` | キャラクターのマスターデータ、属性、レアリティ |
| `user_characters` | `user_id → profiles.id`、`character_id → characters.id`、`acquired_from_battle_id → battle_results.id` |
| `battle_results` | `user_id → profiles.id`、`meal_log_id → meal_logs.id`、敵キャラクター・属性、勝敗、抽選状態、開始・完了日時 |

すべてのユーザー固有テーブルでRLSを有効にし、本人の行だけを `auth.uid() = user_id` で読み書き可能にする。食事画像はSupabase Storageの非公開バケットに保存し、`meal_logs` には画像データではなくパスを保存する。画像表示は本人だけが発行できる短期限の署名URLを使い、排便ログと食事画像を他ユーザーへ公開しない。

## 認証

- Supabase DashboardでAnonymous Sign-Insを有効化する。
- 初回起動時に `signInAnonymously()` を実行し、`auth.users` の作成をトリガーに `profiles` を自動作成する。
- 匿名ユーザーはブラウザデータ削除・別端末への移行後に同じアカウントへ戻れない。この制約をMVP画面に明示し、継続利用版ではApple / Googleログインへのアカウント連携を追加する。

## 実装順

1. Next.jsの初期化、Tailwind、Supabase接続、Anonymous Sign-Ins、RLS、非公開Storageバケット、`src/proxy.ts`。
2. 食事写真の撮影・Storage保存と簡易タグ入力。
3. 敵生成、`startBattleAction`、バトル画面、揺れによる攻撃判定、権限フォールバック、画面スリープ抑止。
4. `completeBattleAction`、撃破演出、排便ログ入力、仲間化抽選、図鑑。
5. カメラ映像を使う仲間化演出と、未完了バトルのリロード復元。
6. 過去ログの一覧表示とデモ用の磨き込み。
