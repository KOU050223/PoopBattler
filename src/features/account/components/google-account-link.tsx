"use client";

import { useCallback, useState } from "react";

import {
  linkGoogleIdentityFromBrowser,
  signInWithGoogleFromBrowser,
} from "@/lib/supabase/google-identity";

import type { AccountStatus } from "../account.types";

type Props = {
  status: AccountStatus;
  /** OAuth から戻ってきたときに表示する画面のパス。 */
  next?: string;
};

type Pending = "link" | "sign-in" | null;

export function GoogleAccountLink({ status, next = "/" }: Props) {
  const [pending, setPending] = useState<Pending>(null);
  const [message, setMessage] = useState("");
  const [confirmingSignIn, setConfirmingSignIn] = useState(false);

  const run = useCallback(
    async (kind: Exclude<Pending, null>) => {
      setPending(kind);
      setMessage("");

      try {
        const result =
          kind === "link"
            ? await linkGoogleIdentityFromBrowser(next)
            : await signInWithGoogleFromBrowser(next);

        if (result.status === "redirecting") {
          // Google へ遷移する。ボタンは押せないままにしておく。
          return;
        }

        setPending(null);
        setMessage(result.message);
      } catch {
        setPending(null);
        setMessage("通信に失敗しました。通信環境を確認して再試行してください。");
      }
    },
    [next],
  );

  if (!status.signedIn) return null;

  // 匿名でないユーザー（メール等で昇格済み）に消失の警告を出してはいけない。
  // その人の記録はブラウザのデータを消しても失われず、「既にアカウントを
  // お持ちの方はこちら」は今のアカウントを捨てる破壊的な導線になる。
  if (!status.isAnonymous && !status.hasGoogleIdentity) return null;

  if (status.hasGoogleIdentity) {
    return (
      <section className="flex flex-col gap-1 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="font-medium">Googleアカウントと連携済みです</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {status.email
            ? `${status.email} でログインしています。別の端末でも同じアカウントでログインすれば、同じ記録を続けられます。`
            : "別の端末でも同じアカウントでログインすれば、同じ記録を続けられます。"}
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
      <div className="flex flex-col gap-1">
        <p className="font-medium">記録が消える可能性があります</p>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          いまは端末内だけのアカウントです。ブラウザのデータを削除したり端末を変えたりすると、
          記録に戻れなくなります。Googleアカウントと連携すると、別の端末でも続きから遊べます。
        </p>
      </div>

      <button
        type="button"
        disabled={pending !== null}
        onClick={() => void run("link")}
        className="min-h-12 rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-black"
      >
        {pending === "link" ? "Googleへ移動しています…" : "Googleアカウントと連携する"}
      </button>

      {confirmingSignIn ? (
        <div className="flex flex-col gap-2 rounded border border-zinc-300 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
          <p className="text-sm">
            既にGoogleアカウントをお持ちの場合はログインできます。
            <strong>この端末でいま記録したデータは引き継がれません。</strong>
            続けますか？
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => void run("sign-in")}
              className="min-h-12 flex-1 rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-black"
            >
              {pending === "sign-in" ? "Googleへ移動しています…" : "ログインする"}
            </button>
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => setConfirmingSignIn(false)}
              className="min-h-12 flex-1 rounded border border-zinc-300 px-4 py-2 disabled:opacity-60 dark:border-zinc-700"
            >
              やめる
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => setConfirmingSignIn(true)}
          className="min-h-12 rounded border border-zinc-400 px-4 py-2 disabled:opacity-60 dark:border-zinc-600"
        >
          既にアカウントをお持ちの方はこちら
        </button>
      )}

      {message && (
        <p aria-live="polite" className="text-sm text-red-700 dark:text-red-400">
          {message}
        </p>
      )}
    </section>
  );
}
