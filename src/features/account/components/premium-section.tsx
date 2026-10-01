"use client";

import { useCallback, useState } from "react";

import {
  createBillingPortalSessionAction,
  type SubscriptionSnapshot,
} from "@/features/billing/actions";

import type { AccountStatus } from "../account.types";

type Props = {
  status: AccountStatus;
  subscription: SubscriptionSnapshot["status"];
};

/**
 * プレミアムの解約・支払い方法の変更への導線。
 *
 * 解約自体は Stripe の顧客ポータルで行う。ポータルは Stripe がホストする
 * 管理画面で、次回請求の停止と支払い方法の変更の両方を扱える。
 * アプリ内で独自の解約ボタンを作ると「請求期間の途中で権利が消える」等の
 * 振る舞いを自分で決める必要が出るため、ポータルへ委ねる。
 *
 * 購読していない利用者には何も出さない。読み取りに失敗したとき（unknown）も
 * 「購読していません」と誤表示しないよう出さない。
 */
export function PremiumSection({ status, subscription }: Props) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  const open = useCallback(async () => {
    setPending(true);
    setMessage("");

    try {
      const result = await createBillingPortalSessionAction("/account");

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

  if (!status.signedIn || subscription !== "subscribed") return null;

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col gap-1">
        <p className="font-medium">プレミアムをご利用中です</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          プレミアムの解約や支払い方法の変更は、Stripeの管理ページで行えます。
          解約してもアカウントや記録は残ります。
        </p>
      </div>

      <button
        type="button"
        disabled={pending}
        onClick={() => void open()}
        className="min-h-12 rounded border border-zinc-300 px-4 py-2 disabled:opacity-60 dark:border-zinc-700"
      >
        {pending ? "管理ページを開いています…" : "プレミアムを管理・解約する"}
      </button>

      {message && (
        <p aria-live="polite" className="text-sm text-red-700 dark:text-red-400">
          {message}
        </p>
      )}
    </section>
  );
}
