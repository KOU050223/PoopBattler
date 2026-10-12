## 概要

Closes #122

必殺技を貯めている間、場に出ている味方うんちくんの周囲にグルグルしたチャージ演出を表示します。チャージ中以外、敵、控えメンバーには表示しません。

## 変更内容

- `BattleFigure` に `charging` を追加し、チャージ中だけ背面に回転エフェクトを描画
- `prefers-reduced-motion` では回転を止め、静止した演出に変更
- `BattleScreen` から、味方の現メンバーにだけ `snapshot.playerStance === "special"` を渡す
- `charging` の有無でエフェクト表示が切り替わるテストを追加

## 動作確認（AI検証済み）

- [x] `npm run test -- src/features/battle/components/battle-figure.test.tsx src/features/battle/battle-figure.motion.test.ts`（5 tests passed）
- [x] `npm run lint -- src/features/battle/components/battle-figure.tsx src/features/battle/components/battle-screen.tsx src/features/battle/components/battle-figure.test.tsx`
- [x] pre-commit hook の `npm run lint`
- [x] `npm run typecheck`
- [x] Next MCP `get_compilation_issues` で `issues: []`
- [x] Next MCP `get_errors` で config/session errors なし
- [x] `agent-browser` で `/battle` を表示し、検証用の必殺準備中状態で味方だけにチャージ装飾が出ることを確認

## 目視確認が必要（人間がマージ前に実施）

- [ ] 実機またはブラウザで必殺ボタンを押し、踏ん張り中の味方うんちくん周囲にグルグル演出が出る
- [ ] 必殺発射、チャージ終了、別スタンスへの切り替えで演出が消える
- [ ] 敵と控えメンバーには演出が出ない
- [ ] `prefers-reduced-motion` 有効時に回転が過度に見えない

## 関連

- issue #122: https://github.com/KOU050223/PoopBattler/issues/122

Generated with Cursor agent / dev-flow skill
