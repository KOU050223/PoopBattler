## 概要

Closes #125
Closes #126

戦闘後ガチャのカメラ映像で COCO-SSD の `toilet` を検出し、選択済みの食事写真をその位置（またはタップ／中央）へ投げ入れる。抽選と保存は既存の Server Action のまま。

## 変更内容

- `@tensorflow/tfjs` と `@tensorflow-models/coco-ssd`（Apache-2.0）をブラウザで動的読み込みする
- `toilet` の bbox と score をデバッグ表示する（検出 / 低score / なし）
- 推論は約 450ms 間隔。カメラフレームは保存・送信しない
- 検出あり: bbox の座面寄りへ写真を移動する
- 検出なし: 画面タップ、それも無ければ画面下部の既定位置
- 投げ入れ後は既存の這い出し／結果表示へ進む

## 動作確認（AI検証済み）

- [x] `npm test` グリーン（300 passed）
- [x] `npm run lint` / `npm run typecheck` グリーン
- [x] `/_next/mcp` の `get_compilation_issues` は空
- [x] toilet 以外のクラスや低scoreは採用しない
- [x] hit の投げ入れ先と、未検出時のタップ／既定位置を取り違えない
- [x] 抽選やり直し文言は出ない

## ⚠️ 目視確認が必要（人間がマージ前に実施）

> これらは AI が検証できません。チェックを入れるのは動かして確認した人です。

- [ ] HTTPS 実機でモデルが読み込まれ、bbox と score が見える
- [ ] 西洋式 / タンクレス / ウォシュレット / 見下ろし / 暗め個室のうち数パターンを試し、#125 に MVP 採用可否を書く
- [ ] 検出ありで写真が便器（座面寄り）へ向かう
- [ ] 検出なしでもタップまたは既定位置で演出が最後まで進む
- [ ] 抽選結果がクライアントで変わらない
- [ ] Network にカメラ映像や推論フレームのアップロードが無い
- [ ] 初回のモデルダウンロード後も操作できる（通信と負荷）

## 関連

- issue #125: https://github.com/KOU050223/PoopBattler/issues/125
- issue #126: https://github.com/KOU050223/PoopBattler/issues/126
- 親: #28
