## 概要

Closes #170

図鑑（`/collection`）の先発3枠と所持リストのキャラを、2D `PoopmFigure` から既存の3D GLBモデル（react-three-fiber `Poopm3DModel`）へ置き換えた。バトル画面（#168）・ガチャ/結果カード（#169）に続く対応。

表示には #169 で作った `PoopmFigure3D`（1体=1個別Canvas）をそのまま使い、多数並ぶ画面向けに**viewport周辺の分だけCanvasをマウントする仮想化**を `PoopmFigure3D` 内に追加した。カード内にCanvasがあるためスクロール時の描画遅延が出ず、画面外のCanvasを外すことで WebGL コンテキスト上限（〜16個）も越えない。

## 変更内容

- `src/features/poopm-3d/components/poopm-figure-3d.tsx` — `useInView`（framer-motion）で viewport ±500px 内にあるときだけ内部の `Poopm3DSolo`（Canvas）をマウント。離れたら外してコンテキストを解放するため、図鑑のように多数並ぶ画面でもコンテキスト数が可視域+マージン分に収まる。外側の `div[role=img]` + `aria-label` は常時描画でSSR挙動も不変
- `collection-list.tsx` — 所持リストの `PoopmFigure` → `PoopmFigure3D`（`facing` は3D版が正面固定のため除去）。あわせてステータス表示を整理: HP・攻撃・速さを色違いの枠付きボックス（ピンク/濃紺/青、中央揃え `text-2xl font-black` のNunito太字数値）の3列に、属性・取得を1行の小さなサブ情報に分け、「選出中」はテキストからフィギュア左上の丸チェックバッジへ変更した（各ラベルに絵文字❤️💪💨🏷️📅）
- `inventory-screen.tsx` — 先発枠も同様に置き換え
- `/dev/poopm-3d` — 「図鑑（カードごとのCanvas・画面外は未マウント）」欄を追加。全8外見を一覧表示して仮想化の動作を確認できる
- `docs/poopm-3d.md` — 多数表示での `PoopmFigure3D` 利用と仮想化の仕組みを追記

外見（体色・目・口・頭）は `appearanceForCharacter` で個体に連動。入れ替え・レンタル枠・空状態の挙動は変更なし。`PoopmFigure` の残使用は title 演出のみ（issue範囲外）。

## 動作確認（AI検証済み）

- [x] `npm test` 458件全通過（所持リストの `role="img"` 検証を追加）
- [x] `tsc --noEmit` / `eslint` / `next build` 通過
- [x] `/dev/poopm-3d` の図鑑欄で全8外見がカード内に3D表示されることを目視確認
- [x] ローカルDBに seed した `/collection` 実画面で確認: 先発3体＋所持8体が3D表示、canvas数が可視域±500px内に限定される（6〜9枚で増減）ことを実測、スクロール追従（遅延なし）、先発選択→リストから入れ替えが動作、コンソールエラーなし

## ⚠️ 目視確認が必要（人間がマージ前に実施）

> これらは AI が検証できません。**チェックを入れるのは動かして確認した人**です。

- [ ] 自分のアカウントで `/collection` を開き、先発・所持のフィギュアが3Dでアイドルアニメーションしている
- [ ] 長いリストを素早くスクロールしたとき、フィギュアのポップインに違和感がない
- [ ] スマホ実機（iOS Safari 等）で描画・スクロールが破綻しない
- [ ] 20体超など大量所持でも描画が破綻しない（仮想化の恩恵確認）

## 関連

- issue #170: https://github.com/KOU050223/PoopBattler/issues/170
- 3Dモデル仕様: `docs/poopm-3d.md`

🤖 Generated with [Devin](https://devin.ai) / dev-flow skill
