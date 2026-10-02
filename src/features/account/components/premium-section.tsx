"use client";

import { useCallback, useState } from "react";

import {
  cancelPremiumAction,
  createBillingPortalSessionAction,
  type SubscriptionSnapshot,
} from "@/features/billing/actions";

import type { AccountStatus } from "../account.types";

type Props = {
  status: AccountStatus;
  subscription: SubscriptionSnapshot["status"];
};

type Pending = "cancel" | "portal" | null;

function formatPeriodEnd(periodEnd: string | null): string | null {
  if (!periodEnd) return null;
  const date = new Date(periodEnd);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("ja-JP");
}

/**
 * プレミアムの解約・支払い管理の導線。
 *
 * 解約はアプリ内で完結させる。`cancel_at_period_end` を立てるだけなので
 * 即時に権利が切れるわけではなく、支払い済みの期間末まで使える。
 * データは一切消えない（消すのはアカウント削除の役目）。
 *
 * 支払い方法の変更や請求履歴は Stripe 顧客ポータルへ委ねる。
 *
 * 購読していない利用者には何も出さない。読み取りに失敗したとき（unknown）も
 * 「購読していません」と誤表示しないよう出さない。
 */
export function PremiumSection({ status, subscription }: Props) {
  const [pending, setPending] = useState<Pending>(null);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState("");
  const [scheduledUntil, setScheduledUntil] = useState<string | null>(null);
  const [scheduled, setScheduled] = useState(false);

  const openPortal = useCallback(async () => {
    setPending("portal");
    setMessage("");

    try {
      const result = await createBillingPortalSessionAction("/account");

      if (result.status === "redirecting") {
        window.location.assign(result.url);
        return;
      }

      setPending(null);
      setMessage(result.message);
    } catch {
      setPending(null);
      setMessage("通信に失敗しました。通信環境を確認して再試行してください。");
    }
  }, []);

  const cancel = useCallback(async () => {
    setPending("cancel");
    setMessage("");

    try {
      const result = await cancelPremiumAction();

      if (result.status === "scheduled") {
        setPending(null);
        setConfirming(false);
        setScheduled(true);
        setScheduledUntil(formatPeriodEnd(result.periodEnd));
        return;
      }

      setPending(null);
      setConfirming(false);
      setMessage(
        result.status === "not-subscribed"
          ? "解約対象の購読が見つかりませんでした。"
          : result.message,
      );
    } catch {
      setPending(null);
      setMessage("通信に失敗しました。通信環境を確認して再試行してください。");
    }
  }, []);

  if (!status.signedIn || subscription !== "subscribed") return null;

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col gap-1">
        <p className="font-medium">プレミアムをご利用中です</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {scheduled
            ? `${scheduledUntil ?? "次の請求日"} に解約されます。それまではプレミアムをご利用いただけます。`
            : "解約すると次回以降の請求が止まります。記録やアカウントは残り、期間の終わりまでは引き続き使えます。"}
        </p>
      </div>

      {scheduled ? (
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => void openPortal()}
          className="min-h-12 rounded border border-zinc-300 px-4 py-2 disabled:opacity-60 dark:border-zinc-700"
        >
          {pending === "portal" ? "管理ページを開いています…" : "支払い方法・請求履歴を確認する"}
        </button>
      ) : confirming ? (
        <div className="flex flex-col gap-2 rounded border border-zinc-300 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
          <p className="text-sm">
            <strong>プレミアムを解約しますか？</strong>
            解約しても記録は消えず、支払い済みの期間が終わるまでは
            プレミアムを使えます。
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => void cancel()}
              className="min-h-12 flex-1 rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-black"
            >
              {pending === "cancel" ? "解約しています…" : "解約する"}
            </button>
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => setConfirming(false)}
              className="min-h-12 flex-1 rounded border border-zinc-300 px-4 py-2 disabled:opacity-60 dark:border-zinc-700"
            >
              やめる
            </button>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            disabled={pending !== null}
            onClick={() => setConfirming(true)}
            className="min-h-12 rounded border border-zinc-300 px-4 py-2 disabled:opacity-60 dark:border-zinc-700"
          >
            プレミアムを解約する
          </button>
          <button
            type="button"
            disabled={pending !== null}
            onClick={() => void openPortal()}
            className="min-h-11 rounded-lg px-3 text-sm font-medium text-zinc-600 underline underline-offset-4 hover:text-zinc-900 disabled:opacity-60 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            {pending === "portal" ? "管理ページを開いています…" : "支払い方法・請求履歴を確認する"}
          </button>
        </>
      )}

      {message && (
        <p aria-live="polite" className="text-sm text-red-700 dark:text-red-400">
          {message}
        </p>
      )}
    </section>
  );
}
