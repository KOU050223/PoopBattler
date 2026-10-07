"use client";

import { useEffect, useRef } from "react";

import { signInAnonymouslyFromBrowser } from "@/lib/supabase/anonymous-session";

/** 画面を止めずに、期限切れセッションを捨てて匿名ログインし直す。 */
export function EnsureAnonymousSession() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void signInAnonymouslyFromBrowser();
  }, []);

  return null;
}
