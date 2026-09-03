import type { Metadata } from "next";

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
  const accountStatus = await getAccountStatusAction();

  return (
    <>
      <PageHeader
        title="アカウント"
        description="Googleアカウントと連携すると、別の端末でも同じ記録を続けられます。"
      />

      <AuthCallbackNotice
        linked={readAuthLinked(params, accountStatus.hasGoogleIdentity)}
        errorCode={readAuthErrorCode(params)}
      />

      <AccountSection initialStatus={accountStatus} />
    </>
  );
}
