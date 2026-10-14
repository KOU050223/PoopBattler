## 概要

Closes #104

バトル中にうんちくんが被弾したあと、体・頭・手足・目・口の位置が idle からずれたまま戻らない不具合を直します。被弾の揺れはコンテナ1箇所に残し、パーツ個別の hit transform はやめました。

## 変更内容

- `PoopmFigure` の hit を idle と同じポーズにし、全モーションで `x: 0` など REST transform を明示する
- `BattleFigure` の被弾シェイクはコンテナの横揺れだけが担い、idle へ戻るとき `x` を即 0 に戻す
- 後ろ向きの頭反転を `animate.scaleX` に移し、REST の `scaleX` と競合しないようにする
- 上記の不変条件を unit test で固定する

## 動作確認（AI検証済み）

- [x] `npm run lint`
- [x] `npm test`（39 files / 201 tests passed）
- [x] `npm run typecheck`
- [x] Next MCP `get_compilation_issues` で issues なし
- [x] Next MCP `compile_route` で `/battle` の issues なし
- [x] agent-browser でバトルを開始し、HP減少後に各パーツの `translateX` が 0 のままであることを確認

## ⚠️ 目視確認が必要（人間がマージ前に実施）

短時間の揺れ演出は AI が完全には判定できないため、以下はブラウザで確認してください。

- [ ] 被弾モーション中は全体として揺れる
- [ ] 被弾モーション後、全パーツが idle 時と同位置・同角度に戻る
- [ ] 連続被弾してもパーツずれが蓄積しない
- [ ] 攻撃モーション（eat）と idle の呼吸・まばたきは維持される
- [ ] 後ろ向きの味方うんちくんの頭が左右反転したままである

## 関連

- issue #104: https://github.com/KOU050223/PoopBattler/issues/104

Generated with Cursor agent / dev-flow skill
