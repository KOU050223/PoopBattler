import { Camera, Swords, NotebookPen, Backpack } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavigationItem = {
  href: "/meals" | "/battle" | "/logs" | "/collection";
  label: string;
  icon: LucideIcon;
};

/** ボトムナビゲーションに並べる経路。表示順がそのままナビの並び順になる。 */
export const navigationItems: readonly NavigationItem[] = [
  { href: "/meals", label: "食事", icon: Camera },
  { href: "/battle", label: "バトル", icon: Swords },
  { href: "/logs", label: "記録", icon: NotebookPen },
  { href: "/collection", label: "インベントリ", icon: Backpack },
];
