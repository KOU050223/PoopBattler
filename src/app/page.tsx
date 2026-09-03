import Link from "next/link";

import { readAuthErrorCode } from "@/features/account/callback-params";
import { AuthCallbackNotice } from "@/features/account/components/auth-callback-notice";
import { primaryButtonClass } from "@/lib/ui-classes";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center bg-blush-wash font-sans">
      <main className="flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
        {/* Supabase は redirectTo が許可リストに一致しないとき、エラーを付けたまま
            site_url（＝この画面）へ直接戻す。アカウント画面を別ルートへ分けても
            この戻り先は変わらないため、エラーの表示はここにも残す。 */}
        <AuthCallbackNotice linked={false} errorCode={readAuthErrorCode(params)} />

        <p aria-hidden="true" className="text-[64px] leading-none">
          💩
        </p>

        <div className="flex flex-col gap-3">
          <h1 className="font-display text-[48px] leading-[1.2] font-bold tracking-[-0.02em] text-flush-pink">
            Poop Battler
          </h1>
          <p className="text-[17px] leading-[1.18] font-medium text-pencil-gray">
            食べたものを記録して、うんちモンスターとのバトルに挑みましょう。
          </p>
        </div>

        <Link href="/battle" className={`flex items-center ${primaryButtonClass}`}>
          はじめる
        </Link>
      </main>
    </div>
  );
}
