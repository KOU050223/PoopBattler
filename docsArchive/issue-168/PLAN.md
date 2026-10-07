# PLAN — Issue #168 バトル3D化

Run: `run_93710f0a635d` / 対象: https://github.com/KOU050223/PoopBattler/issues/168

## 確定仕様（人間の回答済み 2026-10-03）

- スコープ: 戦闘画面(fightビュー)のみ。仲間化AR演出は2Dのまま
- 描画: three + @react-three/fiber + @react-three/drei + @types/three
- 個体差: 体色・目・口のみ（頭アクセはソケット既知不具合で別Issue）
- アニメ: GLB内の idle/attack/hit/special_charge/special_fire/swap_in/swap_out/ko/win/lose を使用（healは未使用・#199待ち）

## タスク

### I168-01 バトル画面の3D化
- 種類：ui
- やること：`src/features/poopm-3d/`（3Dモデル・ステージ・モーション写像・アセット定数・テスト）を新設し、`battle-screen.tsx` の fight ビューの2体の `BattleFigure` を1枚の Canvas（Poopm3DStage）に置き換える。HPバー・相性ピル・倍速・必殺ゲージ・渦巻き・コントロール等のDOM UIは維持。`/dev/poopm-3d` プレビュー頁（dev専用、本番は notFound）を作る
- 触ってよいファイル：`package.json`/`package-lock.json`、`src/features/poopm-3d/**`（新規）、`src/features/battle/components/*`、`src/app/dev/**`（新規）、`docs/poopm-3d.md` への小さな追記のみ
- 完成の条件：`npm run test` / `npm run typecheck` / `npm run lint` / `npm run build` が全て通る。`/dev/poopm-3d` でモデル・アニメ・色・顔差し替えが描画されること
- 見た目の条件：`/dev/poopm-3d` を 375px と 1280px で確認。残滓メッシュが出ないこと
- ブランチ：`issue-168-battle-3d`（base: 1f45ab6 = origin/main）
- 依存：なし
- 状態：needs-human-review（commit a17189b）

### I168-02 うんちくん3Dの頭アクセサリ対応（人間の追加指示）
- 種類：ui
- やること：`appearance.head`（hat-a〜f）を3Dモデルに反映。`head_acc_*`（b_head_accボーンへアタッチ）と `head_var_*`（頭差替え）の2系統を実験し、動く方を採用。プレビュー頁に頭選択UIを追加
- 前提調査済み：`b_head_acc` は稼働リグ内に存在（b_headの子、index 43）。head_var は body ドームと二重になる可能性あり
- 触ってよいファイル：I168-01と同じ範囲 + プレビュー頁
- 完成の条件：test/typecheck/lint/build 通過 + /dev/poopm-3d で頭の切替が表示される
- ブランチ：`guriguri00451/issue-168-battle-3d`（a17189b の上に積む）
- 依存：I168-01（コミット済み）
- 状態：completed（commit a0d3082、人間確認済み）

### I168-03 ベースモデル頭分離 + 素頭バリアント（人間の追加指示）
- 種類：asset+ui
- やること：base GLB を頭なしで再生成（済・coordinator実施）、head_var_none.glb 作成（済）、HeadId "none" 追加、DEFAULT_APPEARANCE を素頭に、透過PNG追加、docs更新
- 前提：unti.blend から再エクスポート済み（body が headless、残骸メッシュ除去、anims 12本）
- 触ってよいファイル：poopm.types/assets/appearances、poopm-3d 配下、preview頁、docs/poopm-3d.md
- 完成の条件：test/typecheck/lint/build 通過 + /dev/poopm-3d で素頭・全hat描画確認
- ブランチ：`guriguri00451/issue-168-battle-3d`（a0d3082 の上に積む）
- 依存：I168-02
- 状態：completed（commit 625adca、人間確認済み）

### I168-04 バトルフィールド + ポケモン風カメラワーク（人間の追加指示）
- 種類：ui（3D演出）
- やること：Canvas内に草原+空のフィールド（接地影つき）、アクション連動カメラ（攻撃ズーム/被弾/必殺/ko/勝敗）
- 前提：3D化・頭分離・素頭はコミット済み（625adca）。モーション状態機械あり
- 完成の条件：test/typecheck/lint/build 通過 + /dev/poopm-3d でフィールド・カメラ遷移の目視確認
- ブランチ：同じ（625adca の上に積む）
- 状態：completed（commit edc09ff＋後続修正 f221a56/c8bc867/e17e729/b09a10d/e934da4/c3a0f45。PR #220 作成済み、CI・人間レビュー待ち）
