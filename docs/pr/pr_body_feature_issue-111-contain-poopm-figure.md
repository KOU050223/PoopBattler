## 概要

Closes #111

うんちくんの手足やモーションが、カード・ボタン・バトル表示の外へ不自然にはみ出す問題を修正します。呼び出し側のレイアウトは変えず、共通コンポーネント `PoopmFigure` 側で収まるようにしました。

## 変更内容

- `PoopmFigure` の外枠を `overflow-hidden` に変更
- 既存のパーツ配置を内側ステージにまとめ、少し縮小・下寄せして左右の手、下の足、`eat` モーション時の頭の動きが枠内に収まるよう調整
- 小さい `h-16 w-16` 枠でも表示領域の制約が残ることをテストに追加

## 動作確認（AI検証済み）

- [x] `npm run test -- src/features/poopm/components/poopm-figure.test.tsx`（5 tests passed）
- [x] `npm run lint -- src/features/poopm/components/poopm-figure.tsx src/features/poopm/components/poopm-figure.test.tsx`
- [x] pre-commit hook の `npm run lint`
- [x] Next MCP `get_compilation_issues` で issues なし
- [x] Next MCP `get_errors` で config/session errors なし
- [x] `agent-browser` で `/collection` と `/battle` が表示できることを確認

## 目視確認が必要（人間がマージ前に実施）

この検証セッションは所持キャラ0、バトル開始前だったため、キャラが実際に出る状態の目視は未確認です。

- [ ] `/collection` の先発枠と所持リストで、うんちくんがカード外へはみ出さない
- [ ] `/battle` の敵/味方表示で、うんちくんがバトルエリア外へはみ出さない
- [ ] バトル完了後の仲間獲得カードで、うんちくんがカード外へはみ出さない
- [ ] モバイル幅とデスクトップ幅の両方で、見た目が自然に収まっている

## 関連

- issue #111: https://github.com/KOU050223/PoopBattler/issues/111

Generated with Cursor agent / dev-flow skill
