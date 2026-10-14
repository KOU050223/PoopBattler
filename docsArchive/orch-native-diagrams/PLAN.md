# PLAN: Native移行に向けた現状・理想クラス図の作成

統合ブランチ: `orch/native-diagrams`
中間メモ置き場: `.orch/native-diagrams/`（git管理外・ワーカー間共有）
最終成果物: `docs/native/current-architecture.md`, `docs/native/ideal-architecture.md`, `docs/native/README.md`

## タスク一覧

### T-001 battle領域の現状マッピング
- 種類：logic（調査・文書作成）
- やること：`src/features/battle/` 全域 + `src/stores/battle-store.ts` + `src/features/poopm/` + `src/features/poopm-3d/` を読み、モジュール依存とデータの流れの調査メモ+Mermaidフラグメントを `.orch/native-diagrams/T-001-battle.md` に書く
- 触ってよいファイル：`.orch/native-diagrams/T-001-battle.md` のみ新規作成（既存ファイルは読むだけ）
- 完成の条件：ファイルが存在し、対象範囲の全ファイル名がメモ内に登場し、```mermaid ブロックを1つ以上含む
- 依存：なし
- 状態：completed

### T-002 記録系の現状マッピング
- 種類：logic
- やること：`src/features/meal/`, `src/features/bowel-log/`, `src/features/collection/`, `src/features/report/`, `src/features/pwa/` を同様に `.orch/native-diagrams/T-002-records.md` にまとめる
- 触ってよいファイル：`.orch/native-diagrams/T-002-records.md` のみ
- 完成の条件：同上
- 依存：なし
- 状態：completed

### T-003 基盤系の現状マッピング
- 種類：logic
- やること：`src/lib/supabase/`, `src/features/account/`, `src/features/auth/`, `src/features/billing/`, `src/proxy.ts`, `src/app/`（ルーティングとServer Componentのデータ受け渡し）, `src/lib/`（motion, wake-lock, user-media-camera）, `src/i18n/`, `src/types/database.types.ts` を `.orch/native-diagrams/T-003-foundation.md` にまとめる
- 触ってよいファイル：`.orch/native-diagrams/T-003-foundation.md` のみ
- 完成の条件：同上
- 依存：なし
- 状態：completed

### T-004 現状図の統合
- 種類：logic
- やること：T-001〜003のメモを統合し `docs/native/current-architecture.md` を作成。全体データフロー図（画面→Server Action/Store→Supabase/IndexedDB）+ 主要featureのクラス図
- 触ってよいファイル：`docs/native/current-architecture.md` のみ
- 完成の条件：ファイルが存在し、全体データフロー図を含む ```mermaid ブロックが2つ以上、構文がパースできる
- 依存：T-001, T-002, T-003
- 状態：completed

### T-005 理想構成の提案
- 種類：logic
- やること：RN/Expo移行を前提とした理想構成の提案本文を `.orch/native-diagrams/T-005-proposal.md` に書く。柱は3本：①バックエンド比較（Supabase直結+RLS vs Next.js API/BFF温存）と推奨案、②共有できる純粋TS層の切り出し候補（battle-runtime/commands、型、enemy-generator等）、③ブラウザAPI→Expo APIの置き換え表
- 触ってよいファイル：`.orch/native-diagrams/T-005-proposal.md` のみ
- 完成の条件：ファイルが存在し、3本柱すべての節がある
- 依存：T-001, T-002, T-003
- 状態：completed

### T-006 理想図の図化
- 種類：logic
- やること：T-005の提案（人間承認済みの前提）を反映した `docs/native/ideal-architecture.md` を作成。理想データフロー図+クラス図
- 触ってよいファイル：`docs/native/ideal-architecture.md` のみ
- 完成の条件：Server Action除去後の代替経路とブラウザAPI全件の置き換え先が図または表に含まれる、mermaid構文が通る
- 依存：T-004, T-005 + 人間承認
- 状態：completed

### T-007 仕上げ
- 種類：logic
- やること：`docs/native/README.md`（索引）作成、`docs/architecture.md` へのリンク追記
- 触ってよいファイル：`docs/native/README.md`, `docs/architecture.md`（リンク追記のみ）
- 完成の条件：リンクが有効（対象ファイル存在）、architecture.md の既存内容を壊していない
- 依存：T-004, T-006
- 状態：completed
