# PROGRESS: native-app

| 日時 | タスク | 担当 | 段階 | 結果 | メモ |
| --- | --- | --- | --- | --- | --- |
| 2026-10-07 | 準備 | 指示役 | - | 完了 | ブランチ orch/native-app 作成。決定: StyleSheet / dev build / iOS先行 / IAPのみ(RevenueCat) / T-001単独先行 |
| 2026-10-07 | T-001 | devin ctx_9ee956be6679 | 第1段階 | completed | typecheck/530tests/lint(baseline警告1)通過、332 rename。注意: Vercel Root Directory=apps/web をダッシュボードで設定要。ワーカー解放済み |
| 2026-10-07 | T-002a | devin ctx_bd03ee99209a | 第1段階 | completed | domainスケルトン+eslint依存禁止(陽性/陰性確認、自分でも再確認)。531tests。解放済み。※指示文作成時にheredocでバッククォートが展開され npm install/test が一度実行された（害なし・ツリー清浄）。教訓: 指示文は必ず 'EOF' クォート付きかwriteツールで作る |
| 2026-10-07 | T-002/T-003/T-004 | devin x3 | dispatch | dispatched | T-002=ctx_d61ae6fe2465(database.types移動も担当) T-003=ctx_98298f9b687a T-004=ctx_7724e515a373。各々別worktree、マージは指示役 |
| 2026-10-07 | T-004 | devin ctx_7724e515a373 | 第1段階 | needs-human-review | typecheck/native14tests通過、統合ブランチへマージ済。確認: apps/native/.env 作成→npm run ios -w apps/native。決定事項: アプリ名はmanifest実体「踏ん張れ！ブリュレイド！！」/bundleId jp.poopbattler.app(仮)/react,react-nativeはnative側に固定(metro resolveRequest) |
| 2026-10-07 | T-004マージ | 指示役 | - | 完了 | package.json(scripts和集合)/package-lock(theirs採用→npm install再生成)の衝突を解消。typecheck/531+1+14 tests通過 |
| 2026-10-07 | T-002 | devin ctx_d61ae6fe2465 | 第1段階 | completed | マージ済。532tests維持(web387+domain145)。ローカル複製型(BowelDraft/MotionPermission/UserMediaCameraStatus)はT-003後に統合要。battle-storeはzustand禁止のためweb残置、SyncKeyValueStorageをports追加 |
| 2026-10-07 | T-003 | devin ctx_98298f9b687a | 第1段階 | completed | マージ済。532tests維持(web309+domain223)。保留: character.types/party-lineup。マージ衝突7件(import行)は指示役が解消。domain eslintの 'motion' 禁止がmotion/ディレクトリに誤マッチ→regexへ修正(陽性/陰性確認) |
| 2026-10-07 | 片付け | 指示役 | - | 記録 | t002/t003 worktree削除(completed・マージ済・clean)。t004 worktreeは needs-human-review のため残すべきだったが誤って削除(cleanで未コミット無し、ブランチ guriguri00451/t004-native-scaffold は残存・マージ済み)。確認はorch/native-appのapps/nativeで可能 |
| 2026-10-07 | T-002b / T-008 | devin x2 | dispatch | dispatched | T-002b=ctx_e5de713c0f92(current) T-008=ctx_8c6da3e6c837(worktree t008-native-battle)。T-005はユーザー承認待ち、T-006はT-002b待ち |
| 2026-10-07 | T-002b | devin ctx_e5de713c0f92 | 第1段階 | completed | TODO(T-003)0件、532tests維持(web297+domain235)、typecheck/lint/build通過、コミット済 |
