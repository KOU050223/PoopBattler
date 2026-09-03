<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 作業の進め方

## 検証は「陽性」と「陰性」を同じ実行で出す

「エラーが出ない」は正しさの証拠にならない。ルールや検査を追加したら、
**落ちるべきケースと通るべきケースを同時に置いて、生の出力を読む**。

grepで絞り込むと、ルールが壊れて何も検査していない場合と、
正しく通っている場合が同じ見え方になる。

```bash
# 悪い: 出力が空 → 「素通りだ」と誤読する。壊れていても同じ出力
npm run lint 2>&1 | grep "no-restricted"

# 良い: 落ちるべき4件と通るべき1件を置き、出力をそのまま読む
npm run lint
```

## 「全部塞ぐ」仕事は、実装前に軸を列挙する

境界・バリデーション・権限のように網羅性が要る変更は、
指摘が来るたびに1つずつ塞ぐと終わらない。先に軸を表にしてから書く。

例（データアクセス境界）: **経路**（ラッパー / 生SDK）×
**構文**（静的import / 動的import）× **拡張子**（tsconfigが読む範囲すべて）×
**適用範囲**（禁止リストではなく、src全体を禁止して許可リストで解除）。

## 「失敗する」より「黙って間違う」を先に疑う

手順やスクリプトを書いたら、通るかどうかだけでなく
**通ったのに結果が間違っている経路**を探す。エラーは気づけるが、
古い型が生成された・検査が偽の合格を返した、は気づけない。

- 手順は「新規チェックアウトで上から実行する」つもりで前提コマンドを確認する
- 状態を再利用する分岐（起動済みDBの流用など）は、初期化を省いていないか見る

## 推測で設計を決めない

「たぶんこうしないと動かない」で回避策を入れる前に、素直な書き方を試して
実際に落ちるか確かめる。不要な回避策はそれ自体が後の抜け穴になる。

# UI / UX

PoopBattler のUIは以下を基本方針とする。

## デザイン方向

「かわいい × バカゲー × 妙にちゃんとしている」

ゲームの題材はコミカルだが、
UIそのものを意図的にダサくしたり子供向けにしない。

The visual humor should come from the concept and details,
not from intentionally making the interface ugly.

PoopBattler should feel like a surprisingly polished product
built around an absurd premise.

## 優先順位

UI変更では以下の順に優先する。

1. usability
2. information hierarchy
3. responsive behavior
4. readability
5. consistency
6. game personality
7. decoration

装飾のために操作性や可読性を犠牲にしない。

## Agent Skills

UI / UX改善では、必要に応じて `.agents/skills/` のSkillを使用する。

特に既存画面の改善では以下を優先する。

- `redesign-existing-projects`
- `design-taste-frontend`
- `gpt-taste`

タスクに関係のないSkillを、インストールされているという理由だけで使用しない。

画像を参考にUIを実装する場合は必要に応じて：

- `image-to-code`
- `imagegen-frontend-web`
- `imagegen-frontend-mobile`

を使用してよい。

## Avoid

特別な意図がない限り、以下を避ける。

- 巨大なHeroセクション
- 巨大すぎる見出し
- 不要な英語のブランドラベル
- genericなAI生成UI
- admin dashboardのような見た目
- 過剰なglassmorphism
- 過剰なgradient
- 過剰なemoji
- うんちアイコンの乱用
- 太すぎるborder
- 強すぎるshadow
- 無理な2カラム化
- Desktopで単純にUIを横へ引き伸ばすこと
- developer向けの内部IDやDBフィールドをユーザーに表示すること

## Responsive

Mobile Firstで考える。

特に日常的に使う画面では、

- 片手で主要操作を行える
- Primary Actionまでの距離を短くする
- Bottom Navigationにコンテンツを隠さない
- Desktopでは適切なmax-widthを使用する
- 横幅を埋めるためだけにレイアウトを複雑化しない

ことを重視する。

## UI変更時の制約

UI改善だけを目的として以下を変更しない。

- API
- database schema
- authentication
- routing
- business logic

既存機能を維持し、
既存のcomponent / icon / animation stackを優先する。

不要なライブラリ追加を避ける。

## User uploaded images

ユーザーがアップロードした画像の内容を推測しない。

画像には写真、スクリーンショット、表、文書、
portrait / landscapeなど任意の内容が含まれる。

カード等で表示する場合は、
固定されたaspect ratioと `object-fit: cover` などを使用し、
画像内容や縦横比によってレイアウトが破綻しないようにする。