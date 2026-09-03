"use client";

import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

import { createBillingPortalSessionAction } from "@/features/billing/actions";

/**
 * 解約・支払い方法の変更へ向かう導線。
 *
 * 購読中の利用者が自分で解約できる場所が無いと、問い合わせでしか止められない。
 * レポート本体の下に、控えめな文字リンクとして置く。
 */
export function ManageSubscriptionLink() {
  const t = useTranslations("Report");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  const open = useCallback(async () => {
    setPending(true);
    setMessage("");

    try {
      const result = await createBillingPortalSessionAction();

      if (result.status === "redirecting") {
        window.location.assign(result.url);
        return;
      }

      setPending(false);
      setMessage(result.message);
    } catch {
      setPending(false);
      setMessage("通信に失敗しました。通信環境を確認して再試行してください。");
    }
  }, []);

  return (
    <div className="mt-6 text-center">
      <button
        type="button"
        onClick={open}
        disabled={pending}
        className="min-h-11 rounded-lg px-3 text-sm font-medium text-pencil-gray underline underline-offset-4 hover:text-charcoal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flush-pink disabled:opacity-60"
      >
        {t("manageSubscription")}
      </button>
      {message ? (
        <p role="alert" className="mt-2 text-sm font-medium text-charcoal">
          {message}
        </p>
      ) : null}
    </div>
  );
}
