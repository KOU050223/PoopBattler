## 概要

Closes #102

タイムアップ時にパーティ全体の残HP割合を敵と比べて敗北にしていたため、1体戦闘不能だと残りが半分程度でも負けになっていた。敗北は3体全滅だけにし、1体でも残っていれば完了へ進む。

## 変更内容

- `resolveByRemainingHp` を `resolveTimeout` に改名し、生存者がいれば `"completing"`、全滅だけ `"defeated"`
- 引き分け用の新ステータスは追加しない。タイムアップ生存は既存の完了フローに乗せる
- `docs/battle.md` のタイムアップ仕様を上記に合わせて明確化
- 旧実装が敗北にしていたケースと、全滅だけ敗北するケースを同じテストに追加

## 動作確認（AI検証済み）

- [x] `npm run lint`
- [x] `npm test`（37 files / 191 tests passed）
- [x] `npm run typecheck`

## 目視確認が必要（人間がマージ前に実施）

> 90秒のタイムアップそのものは AI が実バトルでは踏んでいません。ロジックは unit test で見ています。

- [ ] 1体やられて2体目のHPが半分程度でも、タイムアップ後は敗北画面ではなく完了フローに進む
- [ ] 3体とも倒されたときは、従来どおり敗北のまま
- [ ] 敵を倒して勝ったときの完了フローが壊れていない

## 関連

- issue #102: https://github.com/KOU050223/PoopBattler/issues/102

Generated with Cursor agent / dev-flow skill
