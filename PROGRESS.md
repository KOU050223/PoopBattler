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
| 2026-10-07 | T-006 | devin | dispatch | dispatched | worktree t006-native-records |
| 2026-10-07 | T-008 | devin ctx_8c6da3e6c837 | 第1段階 | needs-human-review | マージ済、typecheck/297+235+56tests/lint通過。マージ後にT-002bの型改名(BowelDraft→BowelLogDraft)を指示役が追従。未対応(仕様範囲外): パーティ選出UI(図鑑側)、食事ログ紐づけ・症状入力。確認手順: バトルタブ→バトルを始める→戦闘→勝利→排便4項目→記録して完了(Supabase env要) |
| 2026-10-07 | T-006 | devin ctx_bb9438e96385 | 第1段階 | needs-human-review | マージ済、297+235+84tests/lint通過。package.json依存和集合+lock再生成で衝突解消。注意: 記録タブは logs.tsx(既存タブ名)、expo-cameraは不採用(image-pickerで撮影)。確認: 記録タブ→ごはん記録→写真/食品群→保存→変更/削除、バトルタブで履歴、コレクションで先発枠編成(再起動後も維持) |
| 2026-10-07 | 準備 | 指示役 | - | 完了 | web-spec.md・picker FULL_SCREEN暫定修正・PLAN更新を統合ブランチへコミット（9f4020b, 4b9b01b） |
| 2026-10-07 | T-012 / T-013b | devin x2 | dispatch | dispatched | T-012=ctx_6b5e35588e3e(worktree t012-battle-complete-flow) T-013b=ctx_9e746953aa31(worktree t013b-layout-typecheck)。T-013からtypecheck修正を分割（app/**のみ、T-012と非衝突）。ピッカー①は実機確認待ちでT-013本体は保留 |
| 2026-10-07 | T-013b | devin ctx_9e746953aa31 | 第1段階 | failed→差し戻し | 「install後は再現しない・変更不要」と報告したが、統合ブランチでは2エラー再現。原因: `.expo/types`+`expo-env.d.ts`（typed routes生成型、gitignore）の有無でscreenOptionsの型推論が変わる。陽性確認: t013bに生成ファイルをコピー→同エラー再現。指示文に `.expo/types` コピー済みと明記して同端末で再dispatch（ctx_17093e4d87eb）。教訓: 生成型の有無で検査対象が変わる—新規worktreeの素通りを疑う |
| 2026-10-07 | T-012 | devin ctx_6b5e35588e3e | 第1段階 | needs-human-review | 指示役検証: typecheck/native92+web297+domain235tests/export ios+android 全通過、マージ済(29dfce3)。食事セッション・編成送信・症状入力、web実装に忠実。確認: コレクションで編成→バトル→勝利→排便4項目+症状→食事セッション(確率コピー・複数記録・スキップ可)→結果。ワーカー解放・ack済 |
| 2026-10-07 | T-013b | devin ctx_17093e4d87eb | 第1段階 | completed | 真因: expo/typesのreact-native-web.d.ts interface拡張がexpo-router側RN型と衝突しtabBar*Styleがweb専用propsのみの型に。satisfies付き定数化+共有prop position:'relative'(デフォルト・無影響)で解消。worktreeで.expo存在下0エラー確認後マージ(7416805)。統合ブランチtypecheck 0エラー・92tests。ワーカー解放・ack済 |
| 2026-10-07 | T-010分割 | 指示役 | - | 完了 | T-010を T-010a(3D基盤PoC・logic) / T-010b(ステージ統合・ui) に分割。ideal-architectureの「GLB1体PoCを早期に」推奨に沿う。新Run run_981c150faffb |
| 2026-10-07 | T-010a | devin ctx_6eb77f1cc7c1 | dispatch | dispatched | worktree t010a-poopm-3d-base（orch/native-appから作成）。expo-gl+three 0.185.1+R3Fv9導入、GLBローダー、純ロジック移植がスコープ |
| 2026-10-07 | T-010a | devin ctx_6eb77f1cc7c1 | 第1段階 | completed | 指示役検証: native typecheck 0/116tests(+24新規)、ルート web297+domain235+native116、export iosでGLB8個+PNGバンドル確認（一時importで実測後revert）。マージ済 2611390→orch/native-app。ワーカー解放・ack済。worktree t010a+t013b削除。残件: 実機でのGLBデコード/描画はT-010bで確認要 |
| 2026-10-07 | T-010b | devin ctx_f0da8d53bd8d | dispatch | dispatched | worktree t010b-poopm-3d-stage。web poopm-3d components+battle-stage-motion 移植、バトル3D化、2D/3D切替（永続化）、結果フィギュア3D。ガチャARはT-009範囲で除外 |
| 2026-10-07 | T-010b | devin ctx_f0da8d53bd8d | 第1段階 | needs-human-review | 指示役検証: worktree・統合ブランチとも typecheck 0・native140tests(+24: stage-motion15/render-mode4/png-rgba5)、ルート web297+domain235、export iosでGLB8個バンドル確認（画面import経由）。マージ済 f599da9。fast-png@8.0.0追加。ワーカー解放・ack済。確認: バトルタブで3Dステージ描画・攻撃/被弾/必殺/交代/勝敗のモーションとカメラワーク・2D/3D切替・勝利後結果の3Dフィギュア・端末のreduce-motion設定時の緩和 |
