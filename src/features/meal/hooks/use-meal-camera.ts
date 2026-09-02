"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type MealCameraStatus =
  | "idle"
  | "starting"
  | "ready"
  | "insecure"
  | "unsupported"
  | "denied"
  | "busy"
  | "unavailable"
  | "error";

function getCameraErrorStatus(error: unknown): MealCameraStatus {
  if (!(error instanceof DOMException)) return "error";
  if (error.name === "NotAllowedError" || error.name === "SecurityError") return "denied";
  if (error.name === "NotReadableError") return "busy";
  if (error.name === "NotFoundError" || error.name === "OverconstrainedError") {
    return "unavailable";
  }
  return "error";
}

/** 食事撮影用のカメラストリームを管理し、不要になったトラックを必ず停止する。 */
export function useMealCamera() {
  const streamRef = useRef<MediaStream | null>(null);
  const requestIdRef = useRef(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<MealCameraStatus>("idle");

  const stop = useCallback(() => {
    requestIdRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    setStatus("idle");
  }, []);

  const start = useCallback(async () => {
    if (!window.isSecureContext) {
      setStatus("insecure");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }

    stop();
    const requestId = ++requestIdRef.current;
    setStatus("starting");

    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      });

      if (requestId !== requestIdRef.current) {
        nextStream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = nextStream;
      setStream(nextStream);
      setStatus("ready");
    } catch (error) {
      if (requestId === requestIdRef.current) setStatus(getCameraErrorStatus(error));
    }
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { stream, status, start, stop };
}
