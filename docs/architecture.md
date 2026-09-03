# PooPBattler アーキテクチャ

## 方針

ハッカソンでは、ネイティブアプリや独自バックエンドを作らず、モバイルWebで「揺らして戦う → 排便ログを残す → 仲間になる」体験を完成させることを優先する。

食事写真は必須にしない。ガチャでカメラロールから読み込んだ場合だけ、うんちくんを仲間にすることができる。食事中にこのアプリは開かない。

- フロントエンドとサーバー処理は **Next.js App Router** に集約する。
- 認証とデータベースは **Supabase** をBaaSとして利用し、食事画像は端末内のIndexedDBへ保存する。
- バトル中の状態はブラウザ内で管理し、終了時の結果だけを保存する。
- 敵の出現と仲間化の抽選はServer Actionで確定し、クライアントは抽選結果を決めない。
- 本格ARではなく、カメラ映像にキャラクターを重ねるAR風演出にする。使うのは戦闘後ガチャだけ。バトル中はカメラを開かない。
- カメラとモーションは独立に落ちる。モーションが使えなくてもバトルは完走できる。カメラが使えなくてもバトルと排便記録は完走できる（ガチャだけできない）。モーションは必殺の踏ん張り判定だけに使う。

## 技術スタック

| 領域 | 技術 | 用途 |
| --- | --- | --- |
| Webアプリ | Next.js + TypeScript | App Router、画面、Server Actions |
| UI | Tailwind CSS + shadcn/ui | 画面構築と共通UI |
| アニメーション | Framer Motion | うんちくんのレイヤー（部位ごと）、攻撃、ダメージ、撃破、仲間化演出 |
| センサー | `DeviceMotionEvent` | 必殺の準備ウィンドウに加速度を見る |
| カメラ | `getUserMedia()` | 戦闘後ガチャ（便器へ向けて這い出てくる）。食事写真はカメラロールから読む |
| 認証・DB・画像 | Supabase | 匿名ログイン、Postgres、Storage |
| 食事画像 | IndexedDB | 画像本体を端末内へ非公開で保存 |
| 一時状態 | Zustand + `persist` | バトル中のHP、スタンス、ゲージ、パーティ、リロード復元用の下書き |
| デプロイ | Vercel | HTTPSでの公開と実機デモ |

## 実装する体験

1. 普段から食事写真を撮影する（アプリ外のカメラにて）（任意。スキップしてもバトルへ進める）。
2. バトルを開始し、モーション利用の許可を取得する。敵はServer Actionが決定する。
   このとき食事ログは参照せず、属性はランダムに決まる。
3. うんちくんが敵のうんちくんとバトルする。自動攻撃＋スタンス指示のバトルをする。ルールは [`battle.md`](./battle.md)。
4. 撃破後に便の硬さ・量・色・出しやすさを選択する。
5. AR起動、選んだ食事写真を便器に投げ入れるとうんちくん抽選が始まる。
6. Server Actionが仲間化を抽選・保存し、バトル中のカメラ表示のまま
   「便器から這い出てくる」演出を出す。
7. 図鑑で取得キャラクターと過去ログを確認する。

## MVPでは実装しないもの

- ARKit / ARCoreによる便器の平面認識
- 食事写真のAI栄養解析
- ユーザー間交換、PvP、マーケット
- プッシュ通知
- Appleアカウント連携（Googleのみ対応する）
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
│  ├─ auth/
│  │  └─ callback/route.ts # OAuthから戻る先。codeをセッションへ交換する
│  ├─ layout.tsx
│  └─ page.tsx
├─ proxy.ts                 # SupabaseセッションCookieの更新
│
├─ features/
│  ├─ account/
│  │  ├─ components/
│  │  ├─ actions.ts        # 匿名のままか、Google連携済みかを返す
│  │  └─ account.types.ts
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
│  ├─ collection/
│  │  ├─ components/
│  │  └─  actions.ts
│  └─ poopm/
│     ├─ assets/            # 同梱パーツ（SVG / PNG）
│     ├─ components/
│     ├─ poopm.appearances.ts
│     └─ poopm.types.ts
│
├─ components/
│  ├─ ui/                  # 汎用UIのみ
│  └─ layout/
│
├─ lib/
│  ├─ supabase/
│  │  ├─ client.ts         # ブラウザ用クライアント
│  │  ├─ server.ts         # Server Component / Server Action用
│  │  ├─ proxy.ts          # セッション更新処理本体
│  │  ├─ anonymous-session.ts # 匿名サインイン（UIへは結果だけ返す）
│  │  ├─ google-identity.ts   # Google連携／ログイン（同上）
│  │  └─ auth-callback.ts     # OAuthのcode交換。Route Handlerが使う
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
     `no-restricted-syntax` で別途塞ぐ。esquery の属性比較はグロブを展開しないので
     セレクタは正規表現で書く）
   - 対象拡張子は `.ts` `.tsx` `.mts` `.js` `.jsx`（tsconfig が読む範囲すべて）

   UIは Server Component から渡されたデータか、`features/<機能名>/actions.ts` の
   Server Actionだけを呼ぶ。

   認証もこの規則の例外にしない。匿名サインインは
   `lib/supabase/anonymous-session.ts` の `signInAnonymouslyFromBrowser()` が
   クライアントの生成を内側に閉じ込め、UIには結果だけを返す。DB操作が可能な
   クライアントをコンポーネントへ渡さないことで、境界にlint抑制を置かずに済む。

   Googleアカウントへの昇格（`lib/supabase/google-identity.ts`）も同じ形を取る。
   `linkIdentity()` / `signInWithOAuth()` はブラウザ側のリダイレクトなので
   Server Action には置けないが、だからといってコンポーネントで生のSDKを
   触ってよいことにはならない。生成をモジュールの内側に閉じ、UIには
   結果だけを返す。

   **Route Handler も例外にしない。** `app/auth/callback/route.ts` は許可リストに
   入っていないため、自分でクライアントを生成できない。OAuthの `code` を
   セッションへ交換する処理は `lib/supabase/auth-callback.ts` に置き、
   Route Handler はその結果でリダイレクト先を決めるだけにする。
   許可リストへ `app/` を足して解決してはいけない。許可リストが
   閉じている穴をそのまま開け直すことになる。
4. バトル中のHP、コンボ、ゲージ、センサー値は Zustand でローカル管理する。`persist` で未完了バトルを `sessionStorage` に復元可能にし、Supabaseには確定結果だけを保存する。
5. 共通化できないコンポーネントを `components/` に置かない。機能固有のものは各 `features/` の配下に置く。
6. 環境変数とService Role Keyはクライアントへ公開しない。秘密鍵を要する処理はServer ActionまたはRoute Handlerに置く。
7. 個人データを持つ全テーブルでRLSを有効化し、`auth.uid() = user_id` を基本ポリシーにする。マスターの `characters` は読み取り専用、更新はサーバー処理に限定する。
8. 食事画像はIndexedDBに置き、`meal_logs.image_path` には画像本体ではなくローカル画像IDだけを保存する。画像はサーバーへ送信せず、同じ端末・ブラウザプロファイル内でのみ参照できる。食事ログの削除・写真差し替え時は、不要になったローカル画像も削除する。

## うんちくんの描画（poopm）

見た目の約束は [`poopm.md`](./poopm.md)。コードは `features/poopm/`。バトルと図鑑はここを import する。

パーツは `src/features/poopm/assets/` にリポジトリ同梱する。SVG と PNG は同じ重ね描画に混在してよい。互いに排他ではない。胴体の色変えは SVG の fill が向く。PNG は塗替えしにくいので、色が乗る面（胴体）は SVG にする。

見た目は`characters.id` をキーにした TS マップ（`poopm.appearances.ts`）。キーは seed の `id` と一致させる。`characters.image_key` は読まない。列は残してよい。見た目用の列は足さない。

型は次の3層に分ける。後ろ向きはマップに持たない。

```ts
type PoopmAppearance = {
  head: HeadId;
  eyes: EyeId;
  mouth: MouthId;
  color: string;
};

type PoopmFigureProps = {
  appearance: PoopmAppearance;
  facing: "front" | "back";
  motion: "idle" | "hit" | "eat";
};
```

`HeadId` などはパーツ ID の string union。DB の `characters` 行（`id` / `name` / `attribute` / `rarity`）とは別物。パーツの追加・削除は assets と TS union / TS マップを同じ差分で更新する。

## センサー・画面状態の扱い

- 加速度は通常攻撃に使わない。必殺の準備ウィンドウでしきい値以上の揺れを約10秒積む（[`battle.md`](./battle.md)）。
- `lib/motion.ts` は `DeviceMotionEvent.requestPermission()` を、必殺を押したユーザー操作の中で呼び出す。`granted`、`denied`、未対応を画面へ返し、利用不可時は準備を省略して即発射する。
- モーションAPIとカメラはHTTPS環境でのみ利用する。実機検証はVercel Preview DeploymentまたはHTTPSトンネルを使い、端末からローカルHTTPサーバーへ直接アクセスしない。
- カメラは戦闘後ガチャの画面だけが開く。バトル画面は `getUserMedia()` を呼ばない。
  食事撮影（`features/meal/`）とガチャは別ストリームで、同時に開かない。
- カメラの可否とモーションの可否は独立に判定する。バトル中はモーションだけを見る。
- カメラ映像・フレームは state にも永続層にも入れず、保存・送信もしない。
- カメラ表示は Screen Wake Lock の代わりにならない。Wake Lock は別途要求する。
- `lib/wake-lock.ts` はバトル中だけScreen Wake Lockを要求し、非対応・拒否時は何もしない。画面が再表示されたときのみ再取得を試み、撃破・離脱時に必ず解放する。
- バトルの永続化対象は、敵ID、敵HP、スタンス、ゲージ、パーティ、開始時刻、完了前の入力内容だけとする。センサーの生データは保存しない。食事写真の紐付けはガチャ時点で行う。

## 敵生成・仲間化の確定

`features/battle/enemy-generator.ts` は、**食事ログを参照せずに**敵を生成する。属性はランダムに決まる。
食事写真がなくても遊べる設計を、敵生成の入口で保証するため。

1. `startBattleAction` が敵キャラクターをランダムに決め、所有者付きの `battle_results` を
   `active` 状態で作成する。この時点で `meal_log_id` は `null`。
2. クライアントはローカルでバトル演出とダメージ計算を行う。カメラは使わない。
3. ガチャで写真を選んだとき、クライアントはIndexedDBへ画像を保存し、`meal_logs` を作成する。
4. `completeBattleAction` は対象のバトルが本人の `active` レコードであることを確認し、
   サーバー側の乱数で仲間化を一度だけ抽選する。`meal_log_id` があるときだけ抽選する。
   写真がなければ排便ログだけ確定し、仲間化は行わない。
5. 抽選結果、排便ログ、取得キャラクター、投げ入れた食事をトランザクションで紐付けて確定する。

これは不正耐性を最小限に保つための設計であり、ハッカソンMVPでは連打・自動化への高度な対策は行わない。

## データモデル（最小）

| テーブル | 主な内容 |
| --- | --- |
| `profiles` | `id → auth.users.id`。匿名ログイン直後にDBトリガーで作成するプロフィール |
| `meal_logs` | `user_id → profiles.id`、食事日時、画像パス、料理タグ、任意メモ |
| `bowel_logs` | `user_id → profiles.id`、`battle_result_id → battle_results.id`（一意）、硬さ、量、色、出しやすさ、記録日時 |
| `characters` | マスター。`id` / `name` / `attribute` / `rarity`。見た目はコードのマップ（上記 poopm）。`image_key` は使わない |
| `user_characters` | `user_id → profiles.id`、`character_id → characters.id`、`acquired_from_battle_id → battle_results.id`、`hp` / `power` / `speed`（個体ごとの数値。詳細は [`battle.md`](./battle.md)） |
| `battle_results` | `user_id → profiles.id`、`meal_log_id → meal_logs.id`（nullable。ガチャで写真を投げ入れた場合のみ入る）、敵キャラクター・属性・敵の3値、`party_snapshot`（開始時に出した個体と3値）、勝敗、抽選状態、開始・完了日時 |

ステータスはマスターの `characters` ではなく `user_characters` に置く。同じ
`character_id` でも所有者や取得タイミングが違えば別の値になる。装備やスキルが
増えるまで別テーブルは作らない。

`battle_results.party_snapshot` は開始時点の確定値。クライアントが数値を偽って
バトルを始められないよう、サーバーが `user_characters` から読んだ値をここに固定する。
「どの個体で戦ったか」の記録も兼ねる。

個体の3値は仲間化時に確定し、以後変わらない（育成は行わない）。

すべてのユーザー固有テーブルでRLSを有効にし、本人の行だけを `auth.uid() = user_id` で読み書き可能にする。食事画像は端末内のIndexedDBへ保存し、`meal_logs` には画像データではなくローカル画像IDを保存する。画像はサーバーへ送信しないため、Storageの公開URL・署名URL・Storageポリシーは使わない。

## 認証

- Supabase DashboardでAnonymous Sign-Insを有効化する。
- 初回起動時に `signInAnonymously()` を実行し、`auth.users` の作成をトリガーに `profiles` を自動作成する。
- 匿名ユーザーはブラウザデータ削除・別端末への移行後に同じアカウントへ戻れない。この制約をMVP画面に明示する。
- **課金を入れる場合、匿名のままにしない。** 支払ったユーザーがブラウザデータ削除で
  アカウントへ戻れず、メールアドレスもないため復旧・サポートができないため。
  `linkIdentity()` でGoogleアカウントへ昇格させてから課金導線を出す。
  AppleはDeveloper Program・証明書・審査で所要時間が読めないため今回は対象外とする。

## 実装順

食事写真はガチャまで不要なので、バトルは食事機能に依存しない。3を2より先に着手してもよい。

1. Next.jsの初期化、Tailwind、Supabase接続、Anonymous Sign-Ins、RLS、非公開Storageバケット、`src/proxy.ts`。
2. 敵生成（ランダム属性）、`startBattleAction`、バトル画面（自動攻撃・スタンス・交代・必殺の踏ん張り準備）、画面スリープ抑止。
3. `completeBattleAction`、撃破演出、排便ログ入力、図鑑。
   ここまでで**食事写真なしのループが一周する**ので、先にこの状態を動かす。写真がなければ仲間化しない。
4. 戦闘後ガチャ。カメラロールから写真を読み込み、
   便器向けカメラを開き、写真を投げ入れ、当たれば這い出てくる演出。
   `completeBattleAction` に `meal_log_id` を渡して抽選する。未完了バトルのリロード復元。
6. 過去ログの一覧表示。
7. Googleアカウント連携、Route Handlerの境界追加、`subscriptions`とRLS、
   Stripe CheckoutとWebhook、レポート画面と課金ゲート、退会時の削除フロー。
   ここは無料部分が一周してから着手する。売る中身（レポート）が動く前に決済だけ作らない。
8. デモ用の磨き込み。
