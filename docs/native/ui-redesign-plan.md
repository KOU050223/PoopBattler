# native UI 改修計画

`apps/native` の、ゲーム以外の画面を作り直す。Pencil で画面案を作ってから実装する。あとで Orca で分担する前提で、フェーズと担当ファイルを切っておく。

**対象:** ホーム・あいぼう（図鑑を置き換え）・きろく・ごはん・保護者メニュー（新規）・レポート・プラン（購入）・アカウント。タブバーはなくす。

**対象外:**
- バトル（`src/features/battle/`）と相撲（`src/features/sumo/`）。食事の記録画面のうち、バトル勝利後に出るもの（`battle-completion-flow.tsx`、`bowel-form.tsx`）もバトル側として扱う。
- web、API・DB（CLAUDE.md の「UI変更時の制約」に従う）。ルーティングだけは下の「画面の構成」のとおり例外として変える。
- レース用の新しい画面（`game-design.md` の新ループはまだ実装がないため別タスク）。
- `src/app/dev/`。

## 決まったこと

- **ライブラリ追加:** OK。Reanimated と Gesture Handler を入れる（P0 のリスクを参照）。
- **進め方:** Pencil（接続済みの MCP）で画面案を作り、ユーザーの確認を取ってから実装する。
- **方向（P1）:** [`DESIGN.md`](../DESIGN.md) の「native 改修の方向」。
- **画面案（P2）:** [`design/poopbattler.pen`](./design/poopbattler.pen)。画像は `design/images/` に置く（`.pen` から相対パスで参照される）。
- **使うSkill:** 次の4つ。`.agents/skills/` にある既存の taste 系（`design-taste-frontend`、`redesign-existing-projects`、`gpt-taste`、`high-end-visual-design`、`brandkit`、`imagegen-*`、`image-to-code`）は使わない。背景やアイコンの絵は Pencil の画像生成で作った。

| Skill | 出典 | 使う範囲 |
|---|---|---|
| `expo-design-system` | [expo/skills](https://github.com/expo/skills/tree/main/plugins/expo/skills/expo-design-system) | 新しい色・文字などのルールと共通部品 |
| `expo-animation` | [expo/skills](https://github.com/expo/skills/tree/main/plugins/expo/skills/expo-animation) | 押したときの反応、画面遷移、触覚フィードバック |
| `expo-native-ui` | [expo/skills](https://github.com/expo/skills/tree/main/plugins/expo/skills/expo-native-ui) | 対象の画面すべて（どれもゲーム外の画面） |
| `frontend-design` | [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | P1 の方向決めだけ。web 向けのコード例は使わない |

## 画面の構成（P2 で決定）

ホームを中心にして、子どもの画面はすべてホームから1タップで行き来する。タブバーとタイトル画面はなくす。

```
ホーム ─┬─ うんちする（大きいピンクの泡） → バトル（将来はレース） → うんちの記録
        ├─ ごはん → ごはん一覧 → きろくする（フォーム）
        ├─ きろく（カレンダーと最近のうんち）
        ├─ 相棒をタップ → あいぼう
        └─ 歯車 → 保護者メニュー ─┬─ 週間レポート
                                  ├─ プラン（購入）
                                  └─ アカウント
```

- **ホーム:** 背景の景色が舞台。右端のタブ（相棒の名前と「れんぞく ○にち」、「うんち きょう○かい」）は表示だけで押せない。
- **「うんちする」1つにまとめた。** バトルとうんちの記録のどちらを押すか迷う問題があったため。中身は今のバトル→記録の流れのまま。
- **れんぞく:** うんちの記録の日付から、アプリ側で連続日数を数える。API・DB は変えない。
- **あいぼう（図鑑の置き換え）:** 3体のチームはなくなった（バトル廃止のため）。メインの相棒1体を大きく出し、左右の矢印かスワイプで切り替える。データができるまでは、今の先発の1枠目をメインとして扱う。頭・手・足のパーツの枠と付け替えシートは画面案にあるが、**P4 では作らない**（パーツのデータができてから別タスク）。
- **きろく:** 「れんぞく」、スタンプ付きのカレンダー、最近のうんちの一覧。バトルの対戦相手となかよし度は出さない。形は「かため / ふつう / やわらかめ」の3つで見せる。レポートは保護者メニューに移す。
- **ごはん:** 子どもの画面ではアルコールとカフェインの食品を出さない（保存されている値は変えない）。緑黄色野菜は「いろの やさい」、淡色野菜は「しろい やさい」と表示する。
- **保護者の確認は挟まない。** 歯車から直接、保護者メニューに入る（ユーザー判断）。購入の承認は OS のファミリー共有に任せる。ただし App Store の Kids カテゴリに出す場合は、購入の前に保護者の確認が必須になる（ガイドライン 1.3）。そのときは購入ボタンの前にだけ足す。
- **戻るボタン:** 子どもの画面は家のアイコン（ホームに戻る）。

## 最大の制約: バトルと相撲の見た目を変えない

バトルと相撲も `@/theme` と `@/components/ui` を読み込んでいる。たとえば相撲の `SetupView` は共通の `Button` と `Segmented` を使っている。そのため `theme.ts` の値や共通部品を書き換えると、対象外の画面の見た目まで変わる。

**方針:** 新しい色・文字などのルールと共通部品は `src/design/` に新しく作り、対象の画面だけをそちらに切り替える。

- `src/theme.ts`、`src/components/ui.tsx`、`src/components/fade-in-view.tsx` は**変更しない**。バトルと相撲が使い続ける。
- 今の色や部品と新しいものが一時的に並んで存在することになる。片付けはバトルとレースの改修で行う。
- 例外はルーティング（`src/app/(tabs)/_layout.tsx`、`src/app/_layout.tsx`）。タブバーをなくすので、バトル画面からもタブバーが消える。バトルにはホームの「うんちする」から入る。

## 現状の問題（対象の範囲）

- **文字サイズが細かすぎる。** `fontSize` は `body / title / tab` の3段だけで、タブのラベルは 11px。
- **色が直書きされている。** 対象の画面にも残っている（`account-screen.tsx`、`teaser-report.tsx`、`weekly-report-view.tsx` など）。

## フェーズ

| フェーズ | 内容 | 進め方 | 前提 |
|---|---|---|---|
| P0 | 準備（Skillとライブラリ） | 1人で順番に | 完了 |
| P1 | コンセプト決め | ユーザーと決める | 完了 |
| P2 | Pencil で画面案を作る | 1人。ユーザーの確認を取る | 完了 |
| P3 | 新しい色・文字のルールと共通部品、画面の構成 | 1人で順番に | P2 |
| P4 | 画面ごとの適用 | **並列にできる** | P3 |
| P5 | 実機での確認 | 1人 | P4 |

### P0: 準備（完了）

Skill を入れ、Reanimated と Gesture Handler を入れた。`babel.config.js` は Reanimated と worklets のプラグインを**わざと無効にしている**（トイレ検出のカメラ処理と `'worklet'` を取り合って落ちたため）。P5 で、トイレ検出（`src/app/dev/toilet-detect.tsx`）と Reanimated のアニメーションが同じビルドで両方動くことを確かめる。

### P3: 新しい色・文字のルールと共通部品（`expo-design-system`、`expo-animation`）

担当ファイル: `src/design/`（新規）、`src/app/(tabs)/_layout.tsx`、`src/app/_layout.tsx`、連続日数の計算（置き場所は着手時に決める）

- `src/design/tokens.ts`: 値は [`DESIGN.md`](../DESIGN.md) の「native 改修の方向」と `.pen` の変数から起こす。
- `src/design/components/`: 子ども用（景色の背景、泡のボタン、表示だけのタブ、下から出るシート、ホームに戻るボタン）と親用（カード、一覧の行、ヘッダー）。押したときの反応と触覚フィードバックをここに入れる。
- 丸ゴシック（Zen Maru Gothic）を入れる。
- タブバーをなくし、ホームを起点にした画面遷移にする。保護者メニューの画面を足す。
- 連続日数の計算を純粋な関数で作り、テストを書く（ホームときろくの両方で使うため、P4 の前に作る）。

**完了条件:**
- 部品集の確認用の画面が実機で表示される。
- `npm run typecheck -w apps/native` と `npm run test -w apps/native` が通る。
- `git diff -- src/theme.ts src/components/` が空になっている。

### P4: 画面ごとの適用（並列にできる）

各画面の読み込み先を `@/theme` と `@/components/ui` から `@/design` に切り替え、P2 の画面案に合わせる。

ワーカー同士で同じファイルを触らないよう、担当範囲を分ける。`src/design/` は P3 で固めたものとして**触らない**。部品が足りないときは、各ワーカーが自分で作らずにコーディネーターに戻す。

| タスク | 画面案 | 担当範囲 |
|---|---|---|
| T1 ホーム | Home v3 / けしき | `src/app/index.tsx`、`src/features/title/` |
| T2 きろく | きろく | `src/app/(tabs)/logs.tsx`、`src/features/bowel-log/`（`bowel-form.tsx` を除く） |
| T3 ごはん | ごはん、ごはん / きろくする | `src/app/meals.tsx`、`src/features/meal/components/` |
| T4 あいぼう | あいぼう（パーツの枠とシートを除く） | `src/app/(tabs)/collection.tsx`、`src/features/collection/components/` |
| T5 保護者向け | 保護者メニュー、レポート、プラン、アカウント | `src/app/report.tsx`、`src/app/account.tsx`、`src/app/purchase.tsx`、`src/features/report/components/`、`src/features/account/components/` |

- 各タスクで、担当範囲にある UI の色の直書きをトークンに置き換える。
- 文言は書き直す。子どもの画面はひらがな中心で短く、親の画面はふつうの漢字。`src/i18n/` は複数のワーカーが同時に触ると衝突するので、1人に集約する。
- `meal-log-form.tsx` はバトル勝利後の画面（`battle-completion-flow.tsx`）からも使われている。そのまま書き換えるとバトル側も変わるので、T3 は外から見た目を渡せる形にするか、記録画面用に別の部品を作る。どちらにするかは着手時にコーディネーターと決める。
- T5 のレポートは、画面案の並びのうち今あるデータで出せる部分だけ作る。「今週のまとめ」「いつもと違った点」「食事との関係」の文面は [#249](https://github.com/KOU050223/PoopBattler/issues/249)・[#250](https://github.com/KOU050223/PoopBattler/issues/250) で作る（どちらも #207 待ち）。P4 では差し込む場所だけ用意する。

### P5: 確認

- `docs/native/web-screenshots/` と同じ画面を、改修前と改修後で撮って並べる。
- バトルと相撲の画面が、タブバーが消えたこと以外は改修前と同じ見た目かどうかを撮って比べる。
- 確認する環境:
  - 小さい画面（iPhone SE）と大きい画面
  - 「視差効果を減らす」がオン
  - 文字サイズを大きくした設定
- P0 のトイレ検出が改修後も動くことを確かめる。

## この改修の後に回すこと

- あいぼうのパーツ（頭・手・足）の枠と付け替えシート。パーツのデータができてから。
- レポートの #249・#250 の中身。
- 育成ゲームへの転換と、ホームの「うんちする」の中身をバトルからレースに変えること（`IDEA.md`・`game-design.md` への反映を含む）。
