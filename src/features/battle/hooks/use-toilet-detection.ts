"use client";

import { useEffect, useState, type RefObject } from "react";

import {
  overlayBoxFromDetection,
  pickToiletDetection,
  toiletSightFromDetection,
  TOILET_DEBUG_SCORE,
  TOILET_INFER_INTERVAL_MS,
  type CocoDetection,
  type ToiletModelStatus,
  type ToiletSight,
} from "@/features/battle/toilet-detection";

type ToiletDetector = {
  detect: (
    video: HTMLVideoElement,
    maxNumBoxes?: number,
    minScore?: number,
  ) => Promise<CocoDetection[]>;
};

let detectorPromise: Promise<ToiletDetector> | null = null;

function loadToiletDetector() {
  detectorPromise ??= (async () => {
    await import("@tensorflow/tfjs");
    const cocoSsd = await import("@tensorflow-models/coco-ssd");
    return cocoSsd.load({ base: "lite_mobilenet_v2" });
  })();
  return detectorPromise;
}

export function useToiletDetection(
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean,
) {
  const [runtimeStatus, setRuntimeStatus] = useState<ToiletModelStatus>("idle");
  const [sight, setSight] = useState<ToiletSight>({ kind: "none" });
  const status: ToiletModelStatus = enabled && runtimeStatus === "idle" ? "loading" : runtimeStatus;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let timer: number | undefined;

    async function runLoop(detector: ToiletDetector) {
      if (cancelled) return;
      setRuntimeStatus("ready");

      const tick = async () => {
        if (cancelled) return;
        const video = videoRef.current;
        if (video && video.readyState >= 2 && video.videoWidth > 0) {
          const detections = await detector.detect(video, 20, TOILET_DEBUG_SCORE);
          if (cancelled) return;
          const picked = pickToiletDetection(detections);
          const display = video.getBoundingClientRect();
          const box = picked
            ? overlayBoxFromDetection(
                picked,
                video.videoWidth,
                video.videoHeight,
                display.width,
                display.height,
              )
            : null;
          setSight(toiletSightFromDetection(picked, box, display.width, display.height));
        }
        if (!cancelled) {
          timer = window.setTimeout(() => {
            void tick();
          }, TOILET_INFER_INTERVAL_MS);
        }
      };

      await tick();
    }

    void loadToiletDetector()
      .then((detector) => runLoop(detector))
      .catch(() => {
        if (cancelled) return;
        setRuntimeStatus("failed");
        setSight({ kind: "none" });
      });

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [enabled, videoRef]);

  return { status, sight };
}
