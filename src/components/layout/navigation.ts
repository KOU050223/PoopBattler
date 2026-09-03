import { Camera, Swords, NotebookPen, Backpack } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavigationItem = {
  href: "/meals" | "/battle" | "/logs" | "/collection";
  labelKey: "meals" | "battle" | "logs" | "collection";
  icon: LucideIcon;
};

/** ボトムナビゲーションに並べる経路。表示順がそのままナビの並び順になる。 */
export const navigationItems: readonly NavigationItem[] = [
  { href: "/meals", labelKey: "meals", icon: Camera },
  { href: "/battle", labelKey: "battle", icon: Swords },
  { href: "/logs", labelKey: "logs", icon: NotebookPen },
  { href: "/collection", labelKey: "collection", icon: BookMarked },
];
