import { useCallback, useEffect, useRef, useState } from "react";

import type { Presentation } from "../types";
import { applyPresentations, createOverlayState, expireOverlay, nextExpiryMs, type OverlayState } from "./overlay-state";

/**
 * 表示の状態を持つ。state が変わるのは出来事が来たときと表示が消えるときだけで、毎フレームは再描画しない。
 * push には FrameResult.presentations と、そのフレームの実時間 ms を渡す
 */
export function useRaceOverlay(): { overlay: OverlayState; push: (presentations: readonly Presentation[], nowMs: number) => void; reset: () => void } {
  const [overlay, setOverlay] = useState(createOverlayState);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 消える時刻は push に渡された時計と同じ ms。タイマーは Date.now との差で待つので、呼び出し側が渡した nowMs の基準を覚える
  const clockOffsetMsRef = useRef(0);

  const push = useCallback((presentations: readonly Presentation[], nowMs: number) => {
    clockOffsetMsRef.current = Date.now() - nowMs;
    setOverlay((current) => applyPresentations(expireOverlay(current, nowMs), presentations, nowMs));
  }, []);

  const reset = useCallback(() => setOverlay(createOverlayState()), []);

  useEffect(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
    const expiry = nextExpiryMs(overlay);
    if (expiry === null) return;
    const waitMs = Math.max(0, expiry + clockOffsetMsRef.current - Date.now());
    timerRef.current = setTimeout(() => setOverlay((current) => expireOverlay(current, expiry)), waitMs);
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [overlay]);

  return { overlay, push, reset };
}
