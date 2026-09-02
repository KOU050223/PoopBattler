"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { signInAnonymouslyFromBrowser } from "@/lib/supabase/anonymous-session";

type Status = "loading" | "ready" | "error";

export function AnonymousSignIn() {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const hasInitialized = useRef(false);

  const initialize = useCallback(async () => {
    setStatus("loading");
    setMessage("");

    try {
      const result = await signInAnonymouslyFromBrowser();

      if (result.status === "error") {
        setStatus("error");
        setMessage(result.message);
        return;
      }

      setStatus("ready");
    } catch {
      setStatus("error");
      setMessage("接続の準備に失敗しました。通信環境を確認して再試行してください。");
    }
  }, []);

  useEffect(() => {
    if (hasInitialized.current) return;

    hasInitialized.current = true;
    void initialize();
  }, [initialize]);

  return (
    <section className="flex flex-col gap-3">
      {status === "loading" && <p aria-live="polite">プレイを準備しています…</p>}
      {status === "ready" && <p aria-live="polite">プレイの準備ができました。</p>}
      {status === "error" && (
        <>
          <p aria-live="polite">匿名アカウントを作成できませんでした。{message}</p>
          <button
            type="button"
            onClick={() => void initialize()}
            className="rounded bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-black"
          >
            再試行する
          </button>
        </>
      )}
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        ブラウザのデータを削除した場合や別の端末へ移行した場合、この匿名アカウントと記録は復旧できません。
      </p>
    </section>
  );
}
