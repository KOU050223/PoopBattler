"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navTabClass } from "@/lib/ui-classes";

import { navigationItems } from "./navigation";

/**
 * モバイル優先のボトムナビゲーション。
 * 現在地は色だけでなく aria-current でも示す。
 */
export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="メインナビゲーション"
      className="fixed inset-x-0 bottom-0 z-10 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
    >
      <ul className="mx-auto flex max-w-3xl gap-1 rounded-2xl border-2 border-faded-gray bg-paper-white p-1 shadow-raised-gray">
        {navigationItems.map(({ href, label, icon: Icon }) => {
          const isCurrent = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={isCurrent ? "page" : undefined}
                className={navTabClass(isCurrent)}
              >
                <Icon aria-hidden="true" className="size-5" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
