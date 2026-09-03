import Link from "next/link";

import { navigationItems } from "@/components/layout/navigation";
import { getAccountStatusAction } from "@/features/account/actions";
import { AccountSection } from "@/features/account/components/account-section";
import { AuthCallbackNotice } from "@/features/account/components/auth-callback-notice";

function firstValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;

  return value ?? null;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const accountStatus = await getAccountStatusAction();

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">Poop Battler</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            食べたものを記録して、うんちモンスターとのバトルに挑みましょう。
          </p>
        </div>

        <AuthCallbackNotice
          // URLのパラメータだけを信じない。`?auth_linked=1` は履歴や共有で
          // 後から再訪でき、匿名のままの利用者に「連携できた＝記録は復旧
          // できる」と誤って伝えてしまう。サーバーで読んだ実際の状態と
          // 一致したときだけ成功を出す。
          linked={
            firstValue(params.auth_linked) === "1"
            && accountStatus.hasGoogleIdentity
          }
          errorCode={firstValue(params.auth_error)}
        />

        <AccountSection
          initialStatus={accountStatus}
          loadStatus={getAccountStatusAction}
        />

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
