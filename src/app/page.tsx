import Link from "next/link";

import { navigationItems } from "@/components/layout/navigation";
import { AnonymousSignIn } from "@/features/auth/components/anonymous-sign-in";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">Poop Battler</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            食べたものを記録して、うんちモンスターとのバトルに挑みましょう。
          </p>
        </div>

        <AnonymousSignIn />

        <nav aria-label="各画面へ移動">
          <ul className="flex flex-col gap-2">
            {navigationItems.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex min-h-14 items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <Icon aria-hidden="true" className="size-5" />
                  <span>{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>
    </div>
  );
}
