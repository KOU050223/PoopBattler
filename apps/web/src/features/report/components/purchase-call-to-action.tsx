"use client";

import { LinkIcon, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

import type { AccountStatus } from "@/features/account/account.types";
import { createCheckoutSessionAction } from "@/features/billing/actions";

type Props = {
  account: AccountStatus;
};

const BUTTON =
  "mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-flush-pink px-5 text-sm font-black text-paper-white transition-transform duration-200 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flush-pink disabled:opacity-60";

/**
 * 購入への導線。
 *
 * 匿名・Google未連携の人には購入ボタンではなく連携への導線を出す。
 * ただしこれは案内であって権利の境界ではない。境界は
 * createCheckoutSessionAction がサーバー側で持つ。
 */
export function PurchaseCallToAction({ account }: Props) {
  const t = useTranslations("Report");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  const purchase = useCallback(async () => {
    setPending(true);
    setMessage("");

    try {
      const result = await createCheckoutSessionAction();

      if (result.status === "redirecting") {
        // Stripe へ遷移する。ボタンは押せないままにしておく。
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

  if (account.isAnonymous || !account.hasGoogleIdentity) {
    return (
      <div className="mt-4">
        <p className="text-sm font-bold text-charcoal">{t("linkRequiredTitle")}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-pencil-gray">
          {t("linkRequiredDescription")}
        </p>
        <a href="/account" className={BUTTON}>
          <LinkIcon aria-hidden="true" className="size-4" />
          {t("linkAccount")}
        </a>
      </div>
    );
  }

  return (
    <div>
      <button type="button" onClick={purchase} disabled={pending} className={BUTTON}>
        <Sparkles aria-hidden="true" className="size-4" />
        {pending ? t("purchasePending") : t("purchase")}
      </button>
      {message ? (
        <p role="alert" className="mt-2 text-sm font-medium text-charcoal">
          {message}
        </p>
      ) : null}
    </div>
  );
}
