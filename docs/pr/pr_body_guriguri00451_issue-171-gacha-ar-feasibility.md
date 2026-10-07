## 概要

Closes #171

「床面で方角を認識して法線方向を確定し、画像認識した座標からうんちくんが飛び出す」演出を検証し、**実現可能と判断した上で擬似ARルートで実装**した。

検証結論（`docs/gacha-ar-feasibility.md`）: 重力ベクトル＋便器bboxアンカー＋2D再アンカーなら追加依存なしで iOS/Android 両対応。真の平面検出・6DoFは WebXR `immersive-ar` が必要で iOS Safari 非対応のため採用見送り。

## 変更内容

- **床法線の3D化** — `DeviceMotionEvent.accelerationIncludingGravity` の3成分から `gravityUpVec` で床法線を算出し平滑化（`smoothGravityVec3`）。`useGravityFloor` が `{ angleDeg, up }` を返す。`Poopm3DSolo` の `gravityUp` prop でモデル＋床影を胴中央ピボットで回転（足裏ピボットだと傾きで体の中心が枠中心からずれるため）。DOM 2D `rotate` は廃止
- **検出座標への追従** — 便器検出を summary まで継続し、reveal 中は `hit` の検出座標へ出現位置を追従（`resolveRevealTarget` + framer-motion で0.3s平滑）。見失った瞬間は投げ入れ先に留まる
- **bboxスケール連動** — `ToiletSight.sizeFraction`（bbox高さ/表示高さ）を追加し、`gachaRevealScale` でモデルスケール推定（0.6〜1.8にクランプ）。スワイプ・スキップ時に `heldScale` へ保持
- **アンカー位置の修正（実機検証で発覚）** — 出現位置は検出枠中心へ正確に合わせる（見切れ防止の中央寄せクランプは撤廃）。表示スケールは `transform: scale` ではなく箱の実寸で適用 — R3F の canvas サイズ計測は transform 込みの bounding rect 基準で、祖先の scale が二重に掛かりモデルが画面右下へずれていた
- **検出座標のステージ基準化** — シェイク演出のオーバースキャンで video が枠より大きいため、bbox をステージ座標へ平行移動してから割合を出す。推論間隔 450ms→120ms、bbox 内の基準点を中央（0.5）へ
- **dev プレビュー** — `/dev/poopm-3d` に傾きプリセット追加。`/dev/gacha-ar` を新設しバトル経由なしで実機検証可能に。`allowedDevOrigins` に `*.trycloudflare.com` を許可し HTTPS トンネル越しの dev サーバーで確認できる
- **ドキュメント** — 検証レポート・ローカルレビューを `docs/` に記録

フォールバック維持: センサー欠損→直立、検出なし→投げ入れ先、カメラ拒否→静止背景、reduced-motion→位置アニメーション即時適用。

## 動作確認

- [x] `npm run typecheck` / `npm run test` / `npm run lint` 通過
- [x] `/dev/poopm-3d` の傾きプリセットで傾き追従を目視確認（モデル中心は枠中心に固定のまま）
- [x] フェイクカメラ（`--use-file-for-fake-video-capture`）に便器映像を流して検出→revealを実走行し、canvas 中心＝検出枠中心を計測で確認
- [x] **スマホ実機**（cloudflared トンネル経由 `/dev/gacha-ar`）で便器検出→スワイプ→reveal まで一巡し、白枠中心にうんちくんが立つことを確認

## 残りの確認事項

- [ ] 端末を傾けたとき床法線方向へモデルが自然に立つか（特に「上から覗く」構図）
- [ ] カメラ拒否・検出失敗時に静止背景フォールバックが機能するか
- [ ] `prefers-reduced-motion` で演出が即スキップされるか

## 関連

- issue #171: https://github.com/KOU050223/PoopBattler/issues/171
- 検証レポート: `docs/gacha-ar-feasibility.md`
- ローカルレビュー: `docs/reviews/pr_review_guriguri00451_issue-171-gacha-ar-feasibility_20261003.md`
- WebXR採用可否の先行調査: issue #130

🤖 Generated with [Devin](https://devin.ai) / dev-flow skill
