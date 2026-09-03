"use client";

import { useCallback, useEffect, useState } from "react";

import { watchAccountStatusFromBrowser } from "@/lib/supabase/account-watch";
import { signInAnonymouslyFromBrowser } from "@/lib/supabase/anonymous-session";

import type { AccountStatus } from "../account.types";
import { AccountMenu } from "./account-menu";
import { HeaderAccountStatus } from "./header-account-status";

/**
 * ヘッダーへ差し込むアカウント表示。セッションの用意と監視を兼ねる。
 *
 * 匿名サインインをここで行うのは、ヘッダーが全画面に出るため。
 * 以前は `/` の AccountSection だけが実行しており、`/battle` へ直接来ると
 * セッションが作られないままだった（実機で確認済み）。
 *
 * サーバーで読んだ値を初期値にしないのは、匿名サインインがブラウザで
 * 行われる以上、初回訪問では必ず未サインインで返るため。
 */
export function HeaderAccountSlot() {
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [failed, setFailed] = useState(false);

  const initialize = useCallback(async () => {
    setFailed(false);

    try {
      const result = await signInAnonymouslyFromBrowser();
      setFailed(result.status === "error");
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    // サインインは「セッションが無い」と分かった時点で行う。監視の
    // コールバック内から呼ぶので、状態の変化に反応する形になる。
    //
    // マウント時に一度だけにすると、画面を離れないログアウトの後に
    // 再実行されず、「ログアウトすると新しい匿名アカウントになる」という
    // 確認文言と実際の挙動がずれる（実機で確認済み）。
    //
    // ensureAnonymousSession は既存セッションがあれば何もしないため、
    // 状態が変わるたびに呼んでも新しいアカウントを作り続けることはない。
    let signingIn = false;

    return watchAccountStatusFromBrowser((next) => {
      setStatus(next);

      if (next.signedIn || signingIn) return;

      signingIn = true;
      void initialize().finally(() => {
        signingIn = false;
      });
    });
  }, [initialize]);

  // 準備に失敗した場合だけ再試行を出す。ヘッダーは狭いので理由は書かず、
  // 押せば直る操作だけを置く。詳しい状態は /account 側が持つ。
  if (failed && !status?.signedIn) {
    return (
      <button
        type="button"
        onClick={() => void initialize()}
        className="flex min-h-11 items-center rounded-xl border-2 border-faded-gray bg-paper-white px-4 text-sm font-bold text-spark-blue shadow-raised-gray"
      >
        再試行する
      </button>
    );
  }

  return (
    <HeaderAccountStatus
      status={status}
      menu={<AccountMenu email={status?.email ?? null} />}
    />
  );
}
