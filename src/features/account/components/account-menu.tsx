"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { signOutFromBrowser } from "@/lib/supabase/sign-out";

import { AccountAvatar } from "./account-avatar";

type Props = {
  email: string | null;
};

/**
 * ヘッダー右上のアイコンから開くプルダウン。
 *
 * 項目はいま「アカウント設定」とログアウトの2つ。増やす場合は
 * 下の menu 内へ role="menuitem" を持つ要素として並べる。
 *
 * ログアウトに確認を挟むのは、`/` が匿名サインインを自動実行するため、
 * ログアウト後はすぐ別の空アカウントが作られるからである（実機で確認済み）。
 * 「元の記録に戻れる」と誤解したまま押させないよう、確認文言で明示する。
 */
export function AccountMenu({ email }: Props) {
  const t = useTranslations("AccountMenu");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const close = useCallback(() => {
    setOpen(false);
    setConfirming(false);
    setMessage("");
  }, []);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) close();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      close();
      // Escape で閉じたときは、開いた元のボタンへ焦点を戻す。
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  const runSignOut = useCallback(async () => {
    setPending(true);
    setMessage("");

    const result = await signOutFromBrowser();

    if (result.status === "error") {
      setPending(false);
      setMessage(result.message);
      return;
    }

    setPending(false);
    close();
    // ヘッダーは onAuthStateChange で追随するが、サーバーで読んだ値から
    // 組み立てられている画面本体（AccountSection など）は古いままになる。
    router.refresh();
  }, [close, router]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={email ? t("menuWithEmail", { email }) : t("menu")}
        onClick={() => (open ? close() : setOpen(true))}
        className="flex min-h-11 items-center"
      >
        <AccountAvatar email={email} />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-20 flex w-64 flex-col gap-2 rounded-2xl border-2 border-faded-gray bg-paper-white p-3 shadow-raised-gray"
        >
          {email && (
            <p className="truncate px-2 text-[13px] leading-[1.23] font-medium text-pencil-gray">
              {email}
            </p>
          )}

          {confirming ? (
            <div className="flex flex-col gap-2">
              <p className="text-[13px] leading-[1.4] font-medium text-charcoal">
                {t("signOutWarning")}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  role="menuitem"
                  disabled={pending}
                  onClick={() => void runSignOut()}
                  className="min-h-11 flex-1 rounded-xl border-2 border-red-300 bg-paper-white px-4 text-sm font-bold text-red-700 shadow-raised-danger disabled:opacity-50"
                >
                  {pending ? t("pending") : t("signOut")}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={pending}
                  onClick={() => setConfirming(false)}
                  className="min-h-11 flex-1 rounded-xl border-2 border-faded-gray bg-paper-white px-4 text-sm font-bold text-spark-blue shadow-raised-gray disabled:opacity-50"
                >
                  {t("cancel")}
                </button>
              </div>
            </div>
          ) : (
            <>
              <Link
                href="/account"
                role="menuitem"
                onClick={close}
                className="flex min-h-11 items-center rounded-xl px-2 text-sm font-bold text-charcoal"
              >
                {t("settings")}
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => setConfirming(true)}
                className="flex min-h-11 items-center rounded-xl px-2 text-left text-sm font-bold text-red-700"
              >
                {t("signOut")}
              </button>
            </>
          )}

          {message && (
            <p aria-live="polite" className="px-2 text-[13px] font-medium text-red-700">
              {message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
