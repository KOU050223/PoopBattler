"use client";

import { useEffect, useState } from "react";

import { watchAccountStatusFromBrowser } from "@/lib/supabase/account-watch";
import type { SubscriptionSnapshot } from "@/features/billing/actions";

import type { AccountStatus } from "../account.types";
import { DeleteAccountSection } from "./delete-account-section";
import { GoogleAccountLink } from "./google-account-link";
import { PremiumSection } from "./premium-section";

type Props = {
  /**
   * サーバー側で読んだアカウント状態。匿名サインインはブラウザで行うため、
   * 初回訪問ではまだ未サインインで返る。表示のちらつきを避けるため
   * これを初期値に使い、ブラウザ側の実際の状態で上書きする。
   */
  initialStatus: AccountStatus;
  /** サーバー側で読んだ購読状態。プレミアム解約の導線を出すかに使う。 */
  subscription: SubscriptionSnapshot;
};

/**
 * アカウント画面の本体。
 *
 * 匿名サインインの実行はヘッダー（HeaderAccountSlot）へ移した。
 * ここに置くとこの画面を開くまでセッションが作られず、`/battle` へ
 * 直接来た利用者が未サインインのままになる。
 */
export function AccountSection({ initialStatus, subscription }: Props) {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => watchAccountStatusFromBrowser(setStatus), []);

  return (
    <div className="flex flex-col gap-4">
      <GoogleAccountLink status={status} />
      <PremiumSection status={status} subscription={subscription} />
      <DeleteAccountSection status={status} />
    </div>
  );
}
