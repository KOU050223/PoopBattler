import { Swords, NotebookPen, BookMarked } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavigationItem = {
  href: "/battle" | "/logs" | "/collection";
  labelKey: "battle" | "logs" | "collection";
  icon: LucideIcon;
};

/** ボトムナビゲーションに並べる経路。表示順がそのままナビの並び順になる。 */
export const navigationItems: readonly NavigationItem[] = [
  { href: "/battle", labelKey: "battle", icon: Swords },
  { href: "/logs", labelKey: "logs", icon: NotebookPen },
  { href: "/collection", labelKey: "collection", icon: BookMarked },
];
