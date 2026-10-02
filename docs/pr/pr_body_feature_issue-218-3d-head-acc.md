## 概要

Closes #218

うんちくん3Dの頭バリエーションを2系統で用意する。`head_acc_<id>.glb` はソケットにアタッチする生成アクセサリ、`head_var_<id>.glb` は頭ごと差し替える手作りバリアント（実行時に `head` ノード差し替え）。ともに静的メッシュのみ。

## 変更内容

- `scripts/poopm-3d/build_head_acc.py`（新規）— hat-a 新芽 / hat-b 王冠 / hat-c 野球帽 / hat-d ニット帽 / hat-e ゴーグル / hat-f デイジーを生成し `public/assets/poopm_3d/head_acc_hat-*.glb` に出力
- `public/assets/poopm_3d/head_acc_hat-{a..f}.glb`（新規）— 生成物6種。原点=接地点、-Y正面、メートル
- `public/assets/poopm_3d/head_var_hat-{a..f}.glb`（新規）— 手作りの頭まるごとバリアント6種（リーフ/王冠/野球帽/すっぽん/ゴーグル/デイジー）。モデル空間座標、実行時に `head` ノードを差し替えて使用
- `scripts/poopm-3d/render_head_acc_preview.py`（新規）— ベースモデルに差し込んだプレビューを `scripts/poopm-3d/out/` にレンダリング
- `scripts/poopm-3d/out/*.png` — 生成済みプレビュー（front/angle × 6）
- `docs/poopm-3d.md` — アクセサリ生成手順・head_var の仕様・既知の問題を追記

## 動作確認（AI検証済み）

- [x] `build_head_acc.py` を Blender 5.1.1 で実行し6種のGLBを生成（30KB〜195KB、アニメーションなし・静的メッシュのみ）
- [x] 生成GLBを `render_head_acc_preview.py` でベースモデルへ再インポート＆レンダリングし、全6種の形状・配色を目視確認（`scripts/poopm-3d/out/` のPNG参照）
- [x] 実行コードへの影響なし（アセットと生成スクリプトのみの変更）

## ⚠️ 既知の問題・フォローアップ

- **ソケット未整備**: 現行 `poopm_base.glb` の稼働リグには `b_head_acc` ボーンがなく、`head_acc` 空ノードは編集残骸の別リグ（地面下）に付いて浮いた位置（z≈1.54）にある。ランタイムでアタッチする前にベースモデル側のソケット整備が必要（別issue推奨）
- GLB内に `arm_L_old` / `*_bak` / 第2アーマチュアなどの編集残骸あり（本PRでは未着手）
- アクセサリの最終的な座り位置はソケット整備時に再調整の可能性あり

## 目視確認が必要（人間がマージ前に実施）

- [ ] `scripts/poopm-3d/out/head_acc_hat-*_front.png` / `_angle.png` で各アクセサリの見た目が2D版の意図（`poopm_hat_*.png`）と整合している
- [ ] GLBファイル名 `head_acc_hat-*.glb` が `HeadId`（`hat-a`〜`hat-f`）と対応している

🤖 Generated with [Devin](https://devin.ai) / dev-flow skill
