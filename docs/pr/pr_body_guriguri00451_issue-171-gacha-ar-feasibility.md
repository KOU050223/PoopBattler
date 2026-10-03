## 概要

Closes #171

「床面で方角を認識して法線方向を確定し、画像認識した座標からうんちくんが飛び出す」演出を検証し、**実現可能と判断した上で擬似ARルートで実装**した。

検証結論（`docs/gacha-ar-feasibility.md`）: 重力ベクトル＋便器bboxアンカー＋2D再アンカーなら追加依存なしで iOS/Android 両対応。真の平面検出・6DoFは WebXR `immersive-ar` が必要で iOS Safari 非対応のため採用見送り。

## 変更内容

- **床法線の3D化** — `DeviceMotionEvent.accelerationIncludingGravity` の3成分から `gravityUpVec` で床法線を算出し平滑化（`smoothGravityVec3`）。`useGravityFloor` が `{ angleDeg, up }` を返す。`Poopm3DSolo` の `gravityUp` prop でモデル＋床影を足裏ピボット（`STAGE_GROUND_Y`）で回転。DOM 2D `rotate` は廃止
- **検出座標への追従** — 便器検出を summary まで継続し、reveal 中は `hit` の検出座標へ出現位置を追従（`resolveRevealTarget` + framer-motion で0.3s平滑）。見失った瞬間は投げ入れ先に留まる
- **bboxスケール連動** — `ToiletSight.sizeFraction`（bbox高さ/表示高さ）を追加し、`gachaRevealScale` でモデルスケール推定（0.6〜1.8にクランプ）。スワイプ・スキップ時に `heldScale` へ保持
- **dev プレビュー** — `/dev/poopm-3d` に傾きプリセット（直立/左右/見下ろし/重力なし）を追加し、傾き追従を目視確認可能に
- **ドキュメント** — 検証レポート・ローカルレビューを `docs/` に記録

フォールバック維持: センサー欠損→直立、検出なし→投げ入れ先、カメラ拒否→静止背景、reduced-motion→位置アニメーション即時適用。

## 動作確認（AI検証済み）

- [x] `npm run typecheck` / `npm run test`（76ファイル463件）/ `npm run lint`（既存警告のみ）/ `npm run build` 全通過
- [x] `/dev/poopm-3d` の傾きプリセットで「左に傾け」→頭部がup方向へ傾斜、「見下ろし」→足元ピボットでカメラ側へ前倒し（頭頂が見える）を目視確認
- [x] 単体テスト: `gravityUpVec` 正規化・欠損、`smoothGravityVec3`、`gachaRevealScale` クランプ境界、`resolveRevealTarget` のhit/low/none分岐

## ⚠️ 目視確認が必要（人間がマージ前に実施）

コード上では確認できない実機依存の挙動:

- [ ] HTTPSのスマホでカメラ起動・便器検出（COCO-SSD）が動くか
- [ ] 便器bbox位置に3Dモデルが出現し、reveal中にカメラを動かすと追従するか
- [ ] 端末を傾けたとき床法線方向へモデルが自然に立つか（特に「上から覗く」構図）
- [ ] bboxサイズ連動が極端にならないか
- [ ] カメラ拒否・検出失敗時に静止背景フォールバックが機能するか
- [ ] summary遷移後にカメラストリームとCanvasが停止するか

## 関連

- issue #171: https://github.com/KOU050223/PoopBattler/issues/171
- 検証レポート: `docs/gacha-ar-feasibility.md`
- ローカルレビュー: `docs/reviews/pr_review_guriguri00451_issue-171-gacha-ar-feasibility_20261003.md`
- WebXR採用可否の先行調査: issue #130

🤖 Generated with [Devin](https://devin.ai) / dev-flow skill
