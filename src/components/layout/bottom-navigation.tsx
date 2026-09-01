"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
      className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-zinc-800 dark:bg-black"
    >
      <ul className="mx-auto flex max-w-3xl">
        {navigationItems.map(({ href, label, icon: Icon }) => {
          const isCurrent = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={isCurrent ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 text-xs ${
                  isCurrent
                    ? "text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
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
