## 概要

Closes #47

撃破・排便入力のあと、食事タブと同じ食事ログ画面を開いて任意で記録し、バトル結果へ紐付ける。選ばなければ `meal_log_id` は `null` のまま仲間化しない。

## 変更内容

- 排便の次に `MealLogForm` を出す（写真・日時・タグ・メモ）。記録せずに完了できる
- 記録した場合は既存 `saveMealLogAction` で本人の `meal_logs` を作り、`completeBattleAction` に `mealLogId` を渡す
- 画面入場時にファイル選択を開く。`/meals` は同じフォーム＋一覧
- 送信中は二重操作を抑止する。食事保存成功後に完了だけ失敗したら、同じ `meal_log_id` で再送する

## 動作確認（AI検証済み）

- [x] `npm test`
- [x] `tsc --noEmit`

## 目視確認が必要（人間がマージ前に実施）

> チェックを入れるのは動かして確認した人です。

- [ ] 勝利 → 排便「次へ」→ 食事タブと同じ記録フォームが開く
- [ ] 記録せずに完了できる。仲間化抽選は行われない
- [ ] 写真・タグを保存して完了できる。`meal_logs` と `battle_results.meal_log_id` が本人の行として付く
- [ ] `/meals` の既存の食事記録が壊れていない

## 関連

- issue #47: https://github.com/KOU050223/PoopBattler/issues/47
