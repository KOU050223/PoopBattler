import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { getAccountStatusAction } from "@/features/account/actions";
import { readAuthErrorCode, readAuthLinked } from "@/features/account/callback-params";
import { AccountSection } from "@/features/account/components/account-section";
import { AuthCallbackNotice } from "@/features/account/components/auth-callback-notice";

export const metadata: Metadata = {
  title: "アカウント",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const [accountStatus, t] = await Promise.all([getAccountStatusAction(), getTranslations("Pages.account")]);

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
      />

      <AuthCallbackNotice
        linked={readAuthLinked(params, accountStatus.hasGoogleIdentity)}
        errorCode={readAuthErrorCode(params)}
      />

      <AccountSection initialStatus={accountStatus} />
    </>
  );
}
