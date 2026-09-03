## 概要

Closes #99

バトル中にうんちくんがダメージを受けた瞬間、短時間だけ赤く点滅する演出を追加しました。既存のHP低下検知と `hit` モーションに乗せているため、ダメージ計算やバトル進行ロジックは変更していません。

## 変更内容

- `BattleFigure` に被ダメージ時の赤フラッシュ用オーバーレイアニメーションを追加
- `prefers-reduced-motion` 相当の設定では点滅を控えめにするよう `useReducedMotion()` を反映
- HP低下イベントごとに再生キーを更新し、連続被弾でもフラッシュが再生されるように変更

## 動作確認（AI検証済み）

- [x] `npm run lint`
- [x] `npm test`（37 files / 184 tests passed）
- [x] `npm run typecheck`
- [x] Next MCP `get_compilation_issues` で issues なし
- [x] Next MCP `compile_route` で `/battle` の issues なし
- [x] agent-browser で `/battle` を開き、バトル開始後の操作UI表示を確認

## 目視確認が必要（人間がマージ前に実施）

短時間の視覚演出は AI が完全には判定できないため、以下はブラウザで確認してください。

- [ ] バトル中、味方うんちくんがダメージを受けた瞬間に赤く点滅する
- [ ] バトル中、敵うんちくんがダメージを受けた瞬間に赤く点滅する
- [ ] ダメージを受けていない間は通常表示のまま
- [ ] 連続被弾しても点滅が破綻せず、攻撃/被弾モーションと不自然に競合しない
- [ ] 点滅が過度に激しく見えない

## 関連

- issue #99: https://github.com/KOU050223/PoopBattler/issues/99

Generated with Cursor agent / dev-flow skill
