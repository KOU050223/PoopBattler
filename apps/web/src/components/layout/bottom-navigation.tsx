"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

import { navTabClass } from "@/lib/ui-classes";

import { navigationItems } from "./navigation";

/**
 * モバイル優先のボトムナビゲーション。
 * 現在地は色だけでなく aria-current でも示す。
 */
export function BottomNavigation() {
  const pathname = usePathname();
  const t = useTranslations("Navigation");

  return (
    <nav
      aria-label={t("label")}
      className="fixed inset-x-0 bottom-0 z-10 border-t border-cotton-pink/60 bg-blush-wash/90 px-3 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-sm"
    >
      <ul className="mx-auto flex max-w-3xl gap-1 rounded-xl bg-paper-white/85 p-1 shadow-[0_3px_12px_rgb(201_77_127_/_0.1)]">
        {navigationItems.map(({ href, labelKey, icon: Icon }) => {
          const isCurrent = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={isCurrent ? "page" : undefined}
                className={navTabClass(isCurrent)}
              >
                <Icon aria-hidden="true" className="size-5" />
                <span>{t(labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
