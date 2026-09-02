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
