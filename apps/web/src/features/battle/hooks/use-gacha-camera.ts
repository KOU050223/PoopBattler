"use client";

import { useEffect } from "react";

import { useUserMediaCamera } from "@/lib/user-media-camera";

/** 戦闘後ガチャ画面だけで背面カメラを開き、unmount で止める。 */
export function useGachaCamera() {
  const { stream, status, start, stop } = useUserMediaCamera();

  useEffect(() => {
    void start();
  }, [start]);

  return { stream, status, start, stop };
}
