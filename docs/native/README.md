# React Native / Expo 移行の図

- [current-architecture.md](./current-architecture.md): 現行Web実装（Next.js + Supabase + Zustand）の構造とデータフロー（As-Is）。
- [ideal-architecture.md](./ideal-architecture.md): 移行後の姿（To-Be）。Supabase直結を基本に、Stripe系のみNext.jsの薄いAPIとして残す案C。
- [migration-proposal.md](./migration-proposal.md): 案Cの選定根拠・Server Action移行対応表・共有層候補・API置き換え表をまとめた提案文書（承認済み）。
- [web-retirement-plan.md](./web-retirement-plan.md): 案Cの続き。`apps/web` を退役させ、ブラウザ版を Expo web、サーバー処理を `apps/api`（Hono）に移す計画。

- [screen-sequence.md](./screen-sequence.md): web版の画面遷移の実測と、native 側の対照。

`current-architecture.md` が参照する `.orch/native-diagrams/` の調査メモはgit管理外で、リポジトリには含まれない。
