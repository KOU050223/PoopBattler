"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { signInAnonymouslyFromBrowser } from "@/lib/supabase/anonymous-session";
import { captionTextClass, primaryButtonClass } from "@/lib/ui-classes";

type Status = "loading" | "ready" | "error";

type Props = {
  /**
   * セッションが使える状態になった時に呼ぶ。匿名サインインはブラウザで行うため、
   * サーバー側で読んだアカウント状態は初回訪問では未サインインになる。
   * 呼び出し元がここで読み直す。
   */
  onReady?: () => void;
};

export function AnonymousSignIn({ onReady }: Props = {}) {
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
      onReady?.();
    } catch {
      setStatus("error");
      setMessage("接続の準備に失敗しました。通信環境を確認して再試行してください。");
    }
  }, [onReady]);

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
            className={primaryButtonClass}
          >
            再試行する
          </button>
        </>
      )}
<<<<<<< HEAD
=======
      <p className={captionTextClass}>
        ブラウザのデータを削除した場合や別の端末へ移行した場合、この匿名アカウントと記録は復旧できません。
      </p>
>>>>>>> origin/main
    </section>
  );
}
