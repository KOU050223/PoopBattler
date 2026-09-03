"use client";

import { useEffect, useRef } from "react";

import {
  releaseScreenWakeLock,
  requestScreenWakeLock,
  type ScreenWakeLockSentinel,
} from "@/lib/wake-lock";

export function useBattleWakeLock(active: boolean) {
  const sentinelRef = useRef<ScreenWakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active) {
      return;
    }

    let cancelled = false;

    const acquire = async () => {
      if (sentinelRef.current && !sentinelRef.current.released) {
        return;
      }
      const sentinel = await requestScreenWakeLock();
      if (cancelled) {
        await releaseScreenWakeLock(sentinel);
        return;
      }
      sentinelRef.current = sentinel;
    };

    void acquire();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void acquire();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      void releaseScreenWakeLock(sentinel);
    };
  }, [active]);
}
