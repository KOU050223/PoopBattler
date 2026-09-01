import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";

// ルートグループはURLを持たないため、typegen の LayoutProps は "/" しか受け付けない。
// ここは children を明示的に型付けする。
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
