"use client";

import { useCallback, useState } from "react";

import { AnonymousSignIn } from "@/features/auth/components/anonymous-sign-in";

import { SIGNED_OUT_ACCOUNT_STATUS, type AccountStatus } from "../account.types";
import { GoogleAccountLink } from "./google-account-link";

type Props = {
  /**
   * サーバー側で読んだアカウント状態。匿名サインインはブラウザで行うため、
   * 初回訪問ではまだ未サインインで返る。その場合はサインイン完了後に読み直す。
   */
  initialStatus: AccountStatus;
  loadStatus: () => Promise<AccountStatus>;
};

export function AccountSection({ initialStatus, loadStatus }: Props) {
  const [status, setStatus] = useState(initialStatus);

  const refresh = useCallback(async () => {
    try {
      setStatus(await loadStatus());
    } catch {
      // 状態を読めない場合は昇格の導線を出さない。匿名サインイン側が
      // 自分のエラーを表示するため、ここで二重にメッセージを出さない。
      setStatus(SIGNED_OUT_ACCOUNT_STATUS);
    }
  }, [loadStatus]);

  return (
    <div className="flex flex-col gap-4">
      <AnonymousSignIn onReady={refresh} />
      <GoogleAccountLink status={status} />
    </div>
  );
}
