import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { readAuthErrorCode } from "@/features/account/callback-params";
import { AuthCallbackNotice } from "@/features/account/components/auth-callback-notice";
import { primaryButtonClass } from "@/lib/ui-classes";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("Home");

  return (
    <div className="title-screen relative flex flex-1 flex-col overflow-hidden bg-blush-wash font-sans">
      <div aria-hidden="true" className="title-screen-atmosphere title-screen-atmosphere-one" />
      <div aria-hidden="true" className="title-screen-atmosphere title-screen-atmosphere-two" />
      <main className="title-screen-main relative mx-auto flex min-h-[calc(100dvh-3.75rem)] w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-6 text-center sm:px-6 sm:py-8 lg:px-10">
        {/* Supabase は redirectTo が許可リストに一致しないとき、エラーを付けたまま
            site_url（＝この画面）へ直接戻す。アカウント画面を別ルートへ分けても
            この戻り先は変わらないため、エラーの表示はここにも残す。 */}
        <AuthCallbackNotice linked={false} errorCode={readAuthErrorCode(params)} />

        <section aria-labelledby="title-screen-heading" className="flex w-full flex-col items-center">
          <h1 id="title-screen-heading" className="sr-only">{t("gameTitle")}</h1>
          <div className="title-screen-logo-stage">
            <Image
              src="/assets/buryulaid-logo.png"
              alt={t("gameTitle")}
              width={1536}
              height={1024}
              priority
              className="title-screen-logo"
            />
          </div>

          <div className="title-screen-copy">
            <p className="text-balance text-[clamp(1.25rem,3.5vw,2.15rem)] font-black leading-[1.12] tracking-[-0.035em] text-charcoal">
              {t("tagline")}
            </p>
            <p className="mt-3 max-w-md text-pretty text-sm font-medium leading-relaxed text-pencil-gray sm:text-base">
              {t("supportingCopy")}
            </p>
          </div>

          <Link href="/battle" className={`title-screen-cta ${primaryButtonClass}`}>
            {t("start")}
          </Link>
        </section>
      </main>
    </div>
  );
}
