## 概要

Closes #171

「床面で方角を認識して法線方向を確定し、画像認識した座標からうんちくんが飛び出す」演出が Web 版（PWA）で実現できるかを調べた検証レポート。

**結論: 擬似ARルート（重力ベクトル＋便器bboxアンカー＋ジャイロ回転補償）なら追加依存なしで iOS/Android 両対応で可能。** 真の平面検出・6DoF は WebXR `immersive-ar` が必要で、iOS Safari では使えないため本命にできない。

## 変更内容

- `docs/gacha-ar-feasibility.md`（新規）— Plan の要件分解と可否、現行実装との差分（法線が2D止まり・アンカー固定・サイズ固定の3点）、実装issueを切る場合の推奨スコープ、制約（カメラFOV非公開など）、実機検証チェックリスト

## 動作確認（AI検証済み）

ドキュメントのみの変更。記述の根拠はコードと照合済み。

- [x] 重力床が画面平面の角度のみでピッチ未使用（`use-gravity-floor.ts`, `companionship-gravity.ts`）
- [x] 便器検出が staging で止まり `heldTarget` に固定（`companionship-ar-stage.tsx`）
- [x] reveal モデルが固定サイズ、iOSモーション権限はバトル中に取得済み（`use-special-motion`）

## ⚠️ 目視確認が必要（人間がマージ前に実施）

> コード変更はないため動作リスクはありません。レポートの**方針判断**だけ確認してください。

- [ ] 結論（擬似ARルート採用・WebXR見送り）に同意できるか
- [ ] 「推奨スコープ」の4項目を次の実装issueに切るか

## 関連

- issue #171: https://github.com/KOU050223/PoopBattler/issues/171
- 既存の仲間化reveal仕様: `docs/companionship-crawl.md`
- WebXR採用可否の先行調査: issue #130

🤖 Generated with [Devin](https://devin.ai) / dev-flow skill
