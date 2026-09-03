# Poop Battler — Style Reference
> 白い紙の上に、丸いマスコットを貼ったようなモバイルUI

**Theme:** light

画面は白い紙。見出しとCTAだけが飽和したピンク `#ff7aac` で「進め」と見える。本文は中間グレーに下げ、インタラクション用の青 `#1cb0f6` と役割を分ける。部品は pill / 太い角丸、枠は 2px。ボタンは紙に貼ったシールに見えること。Duolingo の緑をこのピンクに差し替えた関係で読む。

体験の中身は [`IDEA.md`](./IDEA.md)。画面構成は [`architecture.md`](./architecture.md)。

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Flush Pink | `#ff7aac` | `--color-flush-pink` | 見出し・プライマリCTA・選択中ナビ。本文色には使わない |
| Blush Wash | `#ffe0ef` | `--color-blush-wash` | 選択面の薄い下地、ナビ現在地のハイライト |
| Spark Blue | `#1cb0f6` | `--color-spark-blue` | リンク・セカンダリCTA。ピンクの代わりに「触れる」を示す |
| Cotton Pink | `#ffb3d0` | `--color-cotton-pink` | ピンク面上の補助ラベル。UI本体の塗りには使わない |
| Night Ink | `#000437` | `--color-night-ink` | 必殺など、一瞬だけ濃くする面 |
| Paper White | `#ffffff` | `--color-paper-white` | ページキャンバス、カード、色面上のボタン文字 |
| Charcoal | `#4b4b4b` | `--color-charcoal` | 画面タイトルと本文の作業色 |
| Pencil Gray | `#777777` | `--color-pencil-gray` | 説明文。色付き要素を手前に出すために退く |
| Faded Gray | `#afafaf` | `--color-faded-gray` | 無効・非選択の枠とラベル |

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

角丸はリンク・ボタン・ナビ・カードすべて **12px**（`--radius-xl`）。

- コンテンツ最大幅: 768px（`max-w-3xl`）
- 画面パディング: 16px
- カード内余白: 16–24px
- 要素間: 12px
- ボトムナビ高さ: 56px + safe-area

## Components

### Primary CTA
塗り `#ff7aac`、文字白、sans 700 / 15px、角丸 12px、横パディング 16px。枠なし。白キャンバスの上に置く。「バトル開始」「保存」など進める操作。

### Outlined secondary
透明、文字 `#1cb0f6`、sans 700 / 14px、枠 2px `#afafaf`。「キャンセル」「あとで」など。ピンクCTAの横に置く。

### Bottom nav item
非選択は Pencil Gray。現在地は Flush Pink のアイコンとラベル、下地に Blush Wash を薄く敷いてもよい。ラベルは 15px 700。枠線は上辺 1px ではなく、紙の区切りとして Faded Gray でよい。

### Page title
sans 700 / 32px、色 Charcoal。色はCTAに任せる。

### Body
sans 500 / 17px、色 Pencil Gray。

### Special button（必殺）
塗り Night Ink、文字白。ピンクの通常攻撃と役割が被らないように、ここだけ墨色にする。

### Stance pill（攻撃 / ガード）
選択: 塗り Flush Pink、文字白。非選択: 白地、枠 2px Faded Gray、文字 Charcoal。角丸 12px。

### Collection / meal card
白カード、枠 2px Faded Gray、角丸 12px。キャラや食事写真が中身。UIクロムにマスコットの塗り色を持ち込まない。

## Do's and Don'ts

### Do
- 「進む」「選ばれている」は `#ff7aac` だけにする
- 見出し 48–64px は display 700、-0.02em
- ボタンと pill は角丸 12px + 2px 枠（塗りボタンは枠なしで色が枠の代わり）
- 本文は `#777777` / 17px / 500 を既定にする
- リンクとセカンダリは `#1cb0f6` だけ
- 画面は白の上に白。ピンクはCTA・選択・短い見出しに限る

### Don't
- 本文をピンクや青にしない
- 尖った角、グラデ、影、ガラスを足さない
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
- page: `#ffffff`
- primary fill: `#ff7aac` + 白文字
- secondary: 枠 `#afafaf`、文字 `#1cb0f6`
- special: `#000437`
- selected wash: `#ffe0ef`

例: Primary CTA は Nunito 700 / 15px、塗り `#ff7aac`、角丸 12px、白文字。「バトル開始」。

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
  --radius-xl: 12px;
}
```

Tailwind v4 では同じ名前を `@theme` に載せる。
