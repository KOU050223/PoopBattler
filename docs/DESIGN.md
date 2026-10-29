# Poop Battler — Style Reference

## native 改修の方向（2026-10 決定）

[`native/ui-redesign-plan.md`](./native/ui-redesign-plan.md) の P1・P2 で決めたこと。画面案は [`native/design/poopbattler.pen`](./native/design/poopbattler.pen)。この節より下の旧スタイルは**バトルと相撲だけ**の基準として扱う。

> **ちょっとバカな相棒に、毎日会いに来る場所。**

**誰が使うか:** 小学校低学年が自分のスマホで使う。親が見るのはレポート・アカウント・購入だけ。

**画面は2つのトーンに分ける。** 「システマチックすぎる」原因は、機能ごとに白いカードを並べた作りにある。子どもの画面では、相棒を中心にして組み直す。

| | 子どもの画面（ホーム・あいぼう・きろく・ごはん） | 親の画面（保護者メニュー・レポート・プラン・アカウント） |
|---|---|---|
| 主役 | メインの相棒1体（3D、`assets/poopm_3d/`） | データと手続き |
| 文字 | ひらがな中心で短く。絵と動きで伝える | ふつうの漢字。落ち着いた説明 |
| 相棒 | ときどき一言だけ、少しズレたことを言う。セリフはうんちの種類（ベースの色）で変わり、語尾はユーザーが設定する | 出さない |
| 背景 | 通学路・公園・校庭など子どもの日常。開いた時間帯で朝・昼・夕・夜が変わる。絵は画像生成で作る | なし |
| 入口 | ホームから1タップ | ホームの歯車から直接。保護者の確認は挟まず、購入の承認は OS のファミリー共有に任せる |
| 面 | 景色の上に半透明の泡（下の「部品」） | 背景 `#f6f8fb` に白いカード（枠 1px `#e3e7ee`、角丸 24）。厚みや影はつけない |

**色:** 空色と若草色を土台に、夕焼け色をアクセントにする。ピンク `#ff7aac` は「押せる・選ばれている」だけに使う。金はご褒美・レア専用（ロゴ由来）。

**形:** 旧スタイル（全面ピンクの下地、白カードの羅列、2px 枠、硬いオフセットの立体）は全部捨てる。角のある四角を避け、丸みを主役にする。ボタンは完全な丸か両端が丸いピル形、面は大きな角丸や丘のような曲線で切る。「押せる」は硬い影ではなく、ぷっくりした厚み（下側を少し濃くする）と押したときに縮むばねで伝える。

**文字:** Nunito には日本語の字形がなく、今の日本語は端末の標準フォントで出ている。日本語は Zen Maru Gothic、数字は Nunito。子どもの画面のラベルは 18px を基準にし、どうしても入らないときだけ 15px まで下げる。

**色の値:**

| 名前 | 値 | 使う場所 |
|---|---|---|
| sky / sky-soft | `#5ec4f2` / `#dff3fd` | 空色の土台 |
| leaf / leaf-soft | `#7fcf5a` / `#e8f7dc` | 若草色の土台 |
| sunset | `#ff9a4d` | アクセント |
| pink / pink-edge | `#ff7aac` / `#d9578b` | 押せる・選ばれている |
| gold / gold-edge | `#f5b81c` / `#c98d00` | ご褒美・レア |
| ink / ink-soft | `#2f3440` / `#5f6675` | 文字 |
| line / paper / canvas | `#e3e7ee` / `#ffffff` / `#f6f8fb` | 親の画面の枠・カード・背景 |

**部品（子どもの画面）:**
- **泡のボタン:** 塗りは白 30%（`#ffffff4d`）、内側に白い枠 3px、左上に白い楕円のハイライト、外側にやわらかい影。いちばん大事な操作（ホームの「うんちする」）だけピンクの大きい泡にする。
- **表示だけのタブ:** 画面の右端から出る白いタブ。押せないので、泡のような厚みはつけない。
- **シート:** 一覧やパーツは、景色の上に下から出る白いシートに載せる。
- 戻るボタンは家のアイコン（ホームに戻る）。

**動き:** ばねは強めで、活発に動かす。押したボタンはぷにっと縮んで戻り、触覚も返す。相棒は待っている間も小さく動く。「視差効果を減らす」がオンなら、これらを止める。

---

# 旧スタイル（バトル・相撲）
> 白い紙の上に、丸いマスコットを貼ったようなモバイルUI

**Theme:** light

画面は薄い blush wash。その上に白い角丸カードを置く。見出しとCTAだけが飽和したピンク `#ff7aac` で「進め」と見える。本文は中間グレーに下げ、インタラクション用の青 `#1cb0f6` と役割を分ける。部品は 12–16px の角丸、枠は 2px。立体は下方向 6px の硬いオフセット（ぼかしなし）。Duolingo の緑をこのピンクに差し替えた関係で読む。

体験の中身は [`IDEA.md`](./IDEA.md)。画面構成は [`architecture.md`](../docsArchive/web/architecture.md)。

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Flush Pink | `#ff7aac` | `--color-flush-pink` | 見出し・プライマリCTA・選択中ナビ。本文色には使わない |
| Blush Wash | `#ffe0ef` | `--color-blush-wash` | ページキャンバス、選択面の薄い下地、ナビ現在地のハイライト |
| Spark Blue | `#1cb0f6` | `--color-spark-blue` | リンク・セカンダリCTA。ピンクの代わりに「触れる」を示す |
| Cotton Pink | `#ffb3d0` | `--color-cotton-pink` | ピンク面上の補助ラベル。UI本体の塗りには使わない |
| Night Ink | `#000437` | `--color-night-ink` | 必殺など、一瞬だけ濃くする面 |
| Paper White | `#ffffff` | `--color-paper-white` | カード、ナビ、色面上のボタン文字 |
| Charcoal | `#4b4b4b` | `--color-charcoal` | 画面タイトルと本文の作業色 |
| Pencil Gray | `#777777` | `--color-pencil-gray` | 説明文。色付き要素を手前に出すために退く |
| Faded Gray | `#afafaf` | `--color-faded-gray` | 無効・非選択の枠とラベル |
| Flush Edge | `#c94d7f` | `--color-flush-edge` | ピンク面の立体オフセット |
| Faded Edge | `#6f6f6f` | `--color-faded-edge` | 白面の立体オフセット |
| Night Edge | `#00021a` | `--color-night-edge` | 必殺面の立体オフセット |

## Tokens — Typography

表示用は丸いサンセリフ（Nunito Black 相当）。本文は同じ系統の Grotesk（Nunito / Geist Sans）。顔を増やさず、ウェイトで強弱をつける。

| Role | Face | Weight | Size | Line height | Tracking | Token |
|------|------|--------|------|-------------|----------|-------|
| caption | sans | 500 | 13px | 1.23 | — | `--text-caption` |
| nav-label | sans | 700 | 15px | 1.33 | 0.053em | `--text-nav-label` |
| body | sans | 500 | 17px | 1.18 | — | `--text-body` |
| subheading | sans | 700 | 19px | 1.4 | — | `--text-subheading` |
| heading-sm | sans | 700 | 32px | 1.2 | — | `--text-heading-sm` |
| heading | display | 700 | 48px | 1.2 | -0.02em | `--text-heading` |
| display | display | 700 | 64px | 1.2 | -0.02em | `--text-display` |

`--font-display` は Nunito Black（代替: Nunito 900）。`--font-sans` は Nunito / Geist Sans。display は 48px 以上、それ以下は sans 700。0.053em のトラッキングはナビラベル専用。

## Tokens — Spacing & Shapes

基準 4px。密度は快適（タップ面は最低 44px）。

| Name | Value | Token |
|------|-------|-------|
| 8 | 8px | `--spacing-8` |
| 12 | 12px | `--spacing-12` |
| 16 | 16px | `--spacing-16` |
| 24 | 24px | `--spacing-24` |
| 32 | 32px | `--spacing-32` |
| 40 | 40px | `--spacing-40` |
| 48 | 48px | `--spacing-48` |
| 64 | 64px | `--spacing-64` |

ボタン・フィールド・ナビ項目は **12px**（`--radius-xl`）。カード・写真・ナビバーは **16px**（`--radius-2xl`）。完全な丸はローディングなど円形の部品だけ。

立体は `0 6px 0` の硬いオフセット。押下時は 4px 下げてオフセットを 2px にする。ぼかし影は使わない。

- コンテンツ最大幅: 768px（`max-w-3xl`）
- 画面パディング: 16px
- カード内余白: 16–24px
- 要素間: 12px
- ボトムナビ高さ: 56px + safe-area

## Components

### Primary CTA
塗り `#ff7aac`、文字白、sans 700 / 15px、角丸 12px、横パディング 20px。枠なし。下に Flush Edge の 6px オフセット。白いカードの上に置く。「バトル開始」「保存」など進める操作。

### Outlined secondary
透明、文字 `#1cb0f6`、sans 700 / 14px、枠 2px `#afafaf`、Faded Edge の 6px オフセット。「キャンセル」「あとで」など。ピンクCTAの横に置く。

### Bottom nav item
画面下に浮く角丸バー（16px）。非選択は Pencil Gray。現在地は Flush Pink 塗りと白文字。ラベルは 15px 700。バー全体に枠 2px と Faded Edge オフセット。タブ自体は沈めない。

### Page title
sans 700 / 32px、色 Charcoal。色はCTAに任せる。

### Body
sans 500 / 17px、色 Pencil Gray。

### Special button（必殺）
塗り Night Ink、文字白。ピンクの通常攻撃と役割が被らないように、ここだけ墨色にする。

### Stance pill（攻撃 / ガード）
選択: 塗り Flush Pink、文字白、Flush Edge オフセット。非選択: 白地、枠 2px Faded Gray、文字 Charcoal、Faded Edge オフセット。角丸 12px。

### Collection / meal card
白カード、枠 2px Faded Gray、角丸 16px、Faded Edge の 6px オフセット。キャラや食事写真が中身。UIクロムにマスコットの塗り色を持ち込まない。

## Do's and Don'ts

### Do
- 「進む」「選ばれている」は `#ff7aac` だけにする
- 見出し 48–64px は display 700、-0.02em
- ボタンは角丸 12px + 2px 枠 + 下方向 6px の硬いオフセット（塗りボタンは枠なしで色が枠の代わり）
- カードは角丸 16px + 同じオフセット
- 本文は `#777777` / 17px / 500 を既定にする
- リンクとセカンダリは `#1cb0f6` だけ
- 画面は blush wash の上に白カード。ピンクはCTA・選択・短い見出しに限る

### Don't
- 本文をピンクや青にしない
- 尖った角、グラデ、ぼかし影、ガラスを足さない。立体は硬いオフセットだけ
- display を 48px 未満で使わない
- 色面上に同系色のCTAを置かない（ピンク on ピンク）
- うんちくんの部位色（茶・黄・緑など）をボタンやナビに使わない。キャラ絵の中だけ
- `#ff7aac` をキャプションやリンク色に伸ばさない

面の段は Paper White → Blush Wash → Flush Pink。Night Ink は必殺だけ。

## Imagery

うんちくんは太いアウトラインのフラット2D。部位の色はキャラ固有で、UIトークンとは別レイヤー。写真は食事ログのサムネイルだけ。アイコンはマスコットと同じ太ストローク。1画面に大きなキャラは1体（バトル）か、図鑑のグリッド。

## Layout

モバイル単カラム。幅は 768px で打ち止め。上にタイトル、中央に主操作、下に固定ナビ。バトルはナビを隠して操作を画面下に寄せてもよい。マーケティング用の左右イラスト段組みは使わない。

## Agent Prompt Guide

- heading: `#ff7aac`（短い強調のみ） / 画面タイトルは `#4b4b4b`
- body: `#777777`
- page: `#ffe0ef`
- card: `#ffffff`
- primary fill: `#ff7aac` + 白文字
- secondary: 枠 `#afafaf`、文字 `#1cb0f6`
- special: `#000437`
- selected wash: `#ffe0ef`

例: Primary CTA は Nunito 700 / 15px、塗り `#ff7aac`、角丸 12px、白文字、下に `#c94d7f` の 6px オフセット。「バトル開始」。

## Quick Start

```css
:root {
  --color-flush-pink: #ff7aac;
  --color-blush-wash: #ffe0ef;
  --color-spark-blue: #1cb0f6;
  --color-cotton-pink: #ffb3d0;
  --color-night-ink: #000437;
  --color-paper-white: #ffffff;
  --color-charcoal: #4b4b4b;
  --color-pencil-gray: #777777;
  --color-faded-gray: #afafaf;

  --font-display: "Nunito", ui-sans-serif, system-ui, sans-serif;
  --font-sans: "Nunito", "Geist Sans", ui-sans-serif, system-ui, sans-serif;

  --text-caption: 13px;
  --text-nav-label: 15px;
  --text-body: 17px;
  --text-subheading: 19px;
  --text-heading-sm: 32px;
  --text-heading: 48px;
  --text-display: 64px;
  --font-weight-medium: 500;
  --font-weight-bold: 700;

  --spacing-unit: 4px;
  --page-max-width: 768px;
  --color-flush-edge: #c94d7f;
  --color-faded-edge: #6f6f6f;
  --color-night-edge: #00021a;
  --radius-xl: 12px;
  --radius-2xl: 16px;
  --radius-3xl: 20px;
}
```

Tailwind v4 では同じ名前を `@theme` に載せる。
