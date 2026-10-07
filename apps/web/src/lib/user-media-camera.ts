"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type UserMediaCameraStatus =
  | "idle"
  | "starting"
  | "ready"
  | "insecure"
  | "unsupported"
  | "denied"
  | "busy"
  | "unavailable"
  | "error";

export function inspectUserMediaStart(env: {
  isSecureContext: boolean;
  hasGetUserMedia: boolean;
}): "ok" | "insecure" | "unsupported" {
  if (!env.isSecureContext) return "insecure";
  if (!env.hasGetUserMedia) return "unsupported";
  return "ok";
}

export function userMediaCameraErrorStatus(error: unknown): UserMediaCameraStatus {
  if (!(error instanceof DOMException)) return "error";
  if (error.name === "NotAllowedError" || error.name === "SecurityError") return "denied";
  if (error.name === "NotReadableError") return "busy";
  if (error.name === "NotFoundError" || error.name === "OverconstrainedError") {
    return "unavailable";
  }
  return "error";
}

export function isStaleUserMediaRequest(requestId: number, currentId: number) {
  return requestId !== currentId;
}

/** 背面カメラを優先して開き、不要になったトラックを必ず停止する。 */
export function useUserMediaCamera() {
  const streamRef = useRef<MediaStream | null>(null);
  const requestIdRef = useRef(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<UserMediaCameraStatus>("idle");

  const stop = useCallback(() => {
    requestIdRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    setStatus("idle");
  }, []);

  const start = useCallback(async () => {
    const inspected = inspectUserMediaStart({
      isSecureContext: window.isSecureContext,
      hasGetUserMedia: Boolean(navigator.mediaDevices?.getUserMedia),
    });
    if (inspected !== "ok") {
      setStatus(inspected);
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

      if (isStaleUserMediaRequest(requestId, requestIdRef.current)) {
        nextStream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = nextStream;
      setStream(nextStream);
      setStatus("ready");
    } catch (error) {
      if (!isStaleUserMediaRequest(requestId, requestIdRef.current)) {
        setStatus(userMediaCameraErrorStatus(error));
      }
    }
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { stream, status, start, stop };
}
