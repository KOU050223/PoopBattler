## 概要

Closes #169

戦闘後ガチャ（AR風演出）の reveal で這い出てくる仲間キャラを、2D `PoopmFigure` から既存の3D GLBモデル（react-three-fiber `Poopm3DModel`）へ置き換えた。バトル画面の3D化（#168）に続く対応。

## 変更内容

- `src/features/poopm-3d/components/poopm-3d-gacha.tsx`（新規）— ガチャ reveal 用の小型3Dステージ。`swap_in`（這い出し）→ `win`（お祝い）→ `idle` の順にモーション再生。カメラ映像に重ねるため背景は透明
- `src/features/poopm-3d/components/poopm-3d-blob-shadow.tsx`（新規）— 接地ブロブ影を `poopm-3d-stage.tsx` から抽出して共用化（バトル側の見た目は不変）
- `src/features/battle/components/gacha-stage-3d.tsx`（新規）— `ssr: false` の動的ラッパー（`battle-stage-3d.tsx` と同じ形）
- `companionship-ar-stage.tsx` — reveal の `PoopmFigure` を `GachaStage3D` に差し替え。スポーン位置・重力床の傾き・pop 拡大は従来のDOM演出を維持。仲間がいるときだけ staging 中に3Dチャンクと GLB を先読みし、reveal 開始時のロード待ちを防ぐ
- `/dev/poopm-3d` — ガチャ演出の確認欄を追加（仮背景＋再再生ボタン）

外見（体色・目・口・頭）は `appearanceForCharacter` で個体に連動。抽選・投げ入れ・便器検出・フェーズ遷移・失敗時の表示は変更なし。

## 動作確認（AI検証済み）

- [x] `npm test` 457件全通過（既存のガチャテストも data 属性・aria-label を維持して通過）
- [x] `tsc --noEmit` / `eslint` / `next build` 通過
- [x] `/dev/poopm-3d` のガチャ欄で、這い出し→お祝い→待機のモーション連鎖と全身の収まりを目視確認。`get_errors` で実行時エラーなし

## ⚠️ 目視確認が必要（人間がマージ前に実施）

> これらは AI が検証できません。**チェックを入れるのは動かして確認した人**です。

- [ ] 実機（またはカメラ付き環境）でバトル→食事写真ありのガチャを一巡し、カメラ映像の便器位置に3Dうんちくんが這い出てくる
- [ ] reveal の `swap_in`（入場モーション）が「這い出し」として自然に見える
- [ ] カメラ拒否（静止背景）でも同じ3D reveal が出る
- [ ] 「結果を見る」で summary へ遷移し、Canvas が閉じてもエラーが出ない（DevTools コンソール確認）
- [ ] `prefers-reduced-motion` 環境で reveal が即結果表示になり、モーション無しで破綻しない

## 関連

- issue #169: https://github.com/KOU050223/PoopBattler/issues/169
- 3Dモデル仕様: `docs/poopm-3d.md`

🤖 Generated with [Devin](https://devin.ai) / dev-flow skill
