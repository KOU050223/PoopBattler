"use client";

import { useEffect, useRef, useState, type PointerEvent, type Ref } from "react";
import { motion, useReducedMotion } from "framer-motion";

import type { CompleteBattleResult } from "@/features/battle/actions";
import { BattleCompletionResult } from "@/features/battle/components/battle-completion-result";
import {
  canStartGachaBySwipe,
  clientPointFromPercent,
  companionshipRevealCopy,
  gachaCameraStatusMessage,
  GACHA_SWIPE_MIN_DISTANCE_PX,
  isLiveCameraOverlay,
  isThrowSwipe,
  nextCompanionshipArPhase,
  shouldCrawlOut,
  shouldPlayThrow,
  type CompanionshipArPhase,
} from "@/features/battle/companionship-ar";
import { useGachaCamera } from "@/features/battle/hooks/use-gacha-camera";
import { useToiletDetection } from "@/features/battle/hooks/use-toilet-detection";
import {
  DEFAULT_THROW_TARGET,
  percentPointFromClient,
  resolveThrowTarget,
  toiletDebugCopy,
  type PercentPoint,
  type ToiletModelStatus,
  type ToiletSight,
} from "@/features/battle/toilet-detection";
import { getMealPhoto } from "@/features/meal/meal-photo-storage";
import { PoopmFigure } from "@/features/poopm/components/poopm-figure";
import { appearanceForCharacter } from "@/features/poopm/poopm.appearances";
import type { UserMediaCameraStatus } from "@/lib/user-media-camera";
import { captionTextClass, mutedTextClass, secondaryButtonClass } from "@/lib/ui-classes";

type CompletionSuccess = Extract<CompleteBattleResult, { success: true }>;

export type CompanionshipArFrameProps = {
  result: CompletionSuccess;
  mealPhotoUrl: string | null;
  phase: CompanionshipArPhase;
  status: UserMediaCameraStatus;
  reduceMotion: boolean;
  onSkip: () => void;
  videoRef?: Ref<HTMLVideoElement>;
  toiletSight?: ToiletSight;
  detectionStatus?: ToiletModelStatus;
  throwTarget?: PercentPoint;
  aimPoint?: PercentPoint | null;
  onAim?: (point: PercentPoint) => void;
  onThrowStart?: () => void;
};

function phaseLabel(phase: CompanionshipArPhase, acquired: boolean, canSwipe: boolean) {
  if (phase === "throw") return "食事を便器へ投げ入れています";
  if (phase === "reveal") {
    return acquired ? "うんちくんが這い出てきます" : "仲間化の結果です";
  }
  return canSwipe ? "スワイプして食事を投げ入れてください" : "便器にカメラを向けてください";
}

function ToiletDebugOverlay({ sight }: { sight: ToiletSight }) {
  if (sight.kind === "none") return null;
  const dashed = sight.kind === "low";
  return (
    <div
      data-toilet-box={sight.kind}
      data-toilet-score={sight.box.score.toFixed(2)}
      aria-hidden="true"
      className={`pointer-events-none absolute z-10 rounded-md border-2 ${
        dashed ? "border-dashed border-amber-200" : "border-paper-white"
      }`}
      style={{
        left: sight.box.x,
        top: sight.box.y,
        width: sight.box.width,
        height: sight.box.height,
      }}
    />
  );
}

export function CompanionshipArFrame({
  result,
  mealPhotoUrl,
  phase,
  status,
  reduceMotion,
  onSkip,
  videoRef,
  toiletSight = { kind: "none" },
  detectionStatus = "idle",
  throwTarget = DEFAULT_THROW_TARGET,
  aimPoint = null,
  onAim,
  onThrowStart,
}: CompanionshipArFrameProps) {
  const character = result.acquiredCharacter;
  const acquired = shouldCrawlOut(character);
  const showCamera = phase !== "summary";
  const live = showCamera && isLiveCameraOverlay(status);
  const statusMessage = gachaCameraStatusMessage(status);
  const detectionMessage = showCamera ? toiletDebugCopy(detectionStatus, toiletSight, phase === "staging") : null;
  const canSwipe = canStartGachaBySwipe({
    phase,
    cameraStatus: status,
    modelStatus: detectionStatus,
    sight: toiletSight,
    hasAimPoint: aimPoint != null,
  });
  const revealCopy = companionshipRevealCopy({
    acquired,
    usedMealLog: result.usedMealLog,
  });
  const pointerStartRef = useRef<{ id: number; x: number; y: number } | null>(null);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (phase !== "staging" || !event.isPrimary) return;
    pointerStartRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (phase !== "staging" || !event.isPrimary) return;
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start || start.id !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const end = { x: event.clientX, y: event.clientY };
    const distance = Math.hypot(end.x - start.x, end.y - start.y);

    if (distance < GACHA_SWIPE_MIN_DISTANCE_PX) {
      if (onAim && toiletSight.kind !== "hit") {
        const point = percentPointFromClient(end.x, end.y, rect);
        if (point) onAim(point);
      }
      return;
    }

    if (!canSwipe || !onThrowStart) return;
    const target = clientPointFromPercent(throwTarget, rect);
    if (!isThrowSwipe({ x: start.x, y: start.y }, end, target)) return;
    onThrowStart();
  }

  function handlePointerCancel(event: PointerEvent<HTMLDivElement>) {
    pointerStartRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  if (phase === "summary") {
    return <BattleCompletionResult result={result} />;
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 text-center">
        <p className="text-xl font-bold text-charcoal">{phaseLabel(phase, acquired, canSwipe)}</p>
        <p className={`text-sm ${mutedTextClass}`}>
          仲間化の抽選はすでに確定しています。この画面ではやり直しません。
        </p>
      </div>

      <div
        className="relative min-h-[22rem] touch-none select-none overflow-hidden rounded-2xl border-2 border-faded-gray bg-night-ink shadow-raised-gray aspect-[3/4]"
        data-gacha-swipe={canSwipe ? "ready" : "blocked"}
        aria-label={canSwipe ? "便器へ投げ入れる。スワイプで開始" : "便器が写ったらスワイプできます"}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {live ? (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            aria-label="便器に向けたカメラ"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_78%,var(--color-blush-wash)_0%,transparent_42%),linear-gradient(180deg,#1a1d3a_0%,var(--color-night-ink)_100%)]"
          />
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-night-ink/80 to-transparent" />

        <ToiletDebugOverlay sight={toiletSight} />

        {aimPoint && toiletSight.kind !== "hit" ? (
          <div
            aria-hidden="true"
            data-aim-point="true"
            className="pointer-events-none absolute z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper-white"
            style={{ left: `${aimPoint.x}%`, top: `${aimPoint.y}%` }}
          />
        ) : null}

        {mealPhotoUrl && (phase === "throw" || phase === "reveal") ? (
          <motion.img
            src={mealPhotoUrl}
            alt="便器へ投げ入れる食事の写真"
            data-throw-x={throwTarget.x.toFixed(1)}
            data-throw-y={throwTarget.y.toFixed(1)}
            className="absolute z-20 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-2xl object-cover shadow-raised-gray"
            initial={reduceMotion ? false : { left: "50%", top: "14%", scale: 1, rotate: -8, opacity: 1 }}
            animate={{
              left: `${throwTarget.x}%`,
              top: `${throwTarget.y}%`,
              scale: 0.28,
              rotate: 16,
              opacity: 0.55,
            }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
        ) : null}

        {phase === "reveal" && acquired && character ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex h-[58%] items-end justify-center overflow-hidden">
            <motion.div
              initial={reduceMotion ? false : { y: "110%" }}
              animate={{ y: 0 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 1.15, ease: [0.16, 1, 0.3, 1] }}
            >
              <PoopmFigure
                appearance={appearanceForCharacter(character.id)}
                facing="front"
                motion="idle"
                label={character.name}
                className="h-44 w-44"
              />
            </motion.div>
          </div>
        ) : null}

        {phase === "reveal" ? (
          <p
            role="status"
            className="absolute inset-x-3 bottom-3 z-40 rounded-xl bg-paper-white/92 px-3 py-2 text-center text-sm font-bold text-charcoal"
          >
            {revealCopy}
          </p>
        ) : null}
      </div>

      {statusMessage ? (
        <p role="status" className={captionTextClass}>{statusMessage}</p>
      ) : null}

      {detectionMessage ? (
        <p role="status" data-toilet-debug="true" className={captionTextClass}>{detectionMessage}</p>
      ) : null}

      <button type="button" className={secondaryButtonClass} onClick={onSkip}>
        結果を見る
      </button>
    </section>
  );
}

function useMealPhotoUrl(photoId: string | null) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!photoId) return;

    let active = true;
    let objectUrl: string | undefined;

    void getMealPhoto(photoId)
      .then((photo) => {
        if (!active || !photo) return;
        objectUrl = URL.createObjectURL(photo);
        setUrl(objectUrl);
      })
      .catch(() => undefined);

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoId]);

  return photoId ? url : null;
}

export function CompanionshipArStage({
  result,
  mealPhotoId,
}: {
  result: CompletionSuccess;
  mealPhotoId: string | null;
}) {
  const reduceMotion = useReducedMotion();
  const { stream, status, stop } = useGachaCamera();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mealPhotoUrl = useMealPhotoUrl(mealPhotoId);
  const [phase, setPhase] = useState<CompanionshipArPhase>("staging");
  const [aimPoint, setAimPoint] = useState<PercentPoint | null>(null);
  const [heldTarget, setHeldTarget] = useState<PercentPoint>(DEFAULT_THROW_TARGET);
  const hasPhoto = shouldPlayThrow(mealPhotoId);
  const detectEnabled = phase === "staging" && isLiveCameraOverlay(status);
  const { status: detectionStatus, sight } = useToiletDetection(videoRef, detectEnabled);
  const liveTarget = resolveThrowTarget({ sight, tap: aimPoint });
  const liveTargetRef = useRef(liveTarget);
  const throwTarget = phase === "staging" ? liveTarget : heldTarget;

  useEffect(() => {
    liveTargetRef.current = liveTarget;
  }, [liveTarget]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    void video.play().catch(() => undefined);
    return () => {
      video.srcObject = null;
    };
  }, [stream]);

  useEffect(() => {
    if (phase === "summary") {
      stop();
    }
  }, [phase, stop]);

  useEffect(() => {
    if (phase === "summary" || phase === "staging") return;
    const delay = reduceMotion ? 0 : phase === "throw" ? 900 : 1500;
    const timer = window.setTimeout(() => {
      setPhase((current) => nextCompanionshipArPhase(current, hasPhoto));
    }, delay);
    return () => window.clearTimeout(timer);
  }, [hasPhoto, phase, reduceMotion]);

  function startThrowFromSwipe() {
    setHeldTarget(liveTargetRef.current);
    setPhase((current) => nextCompanionshipArPhase(current, hasPhoto));
  }

  return (
    <CompanionshipArFrame
      result={result}
      mealPhotoUrl={hasPhoto ? mealPhotoUrl : null}
      phase={phase}
      status={status}
      reduceMotion={Boolean(reduceMotion)}
      onSkip={() => {
        setHeldTarget(liveTargetRef.current);
        setPhase("summary");
      }}
      videoRef={videoRef}
      toiletSight={sight}
      detectionStatus={detectEnabled || phase !== "staging" ? detectionStatus : "failed"}
      throwTarget={throwTarget}
      aimPoint={aimPoint}
      onAim={setAimPoint}
      onThrowStart={startThrowFromSwipe}
    />
  );
}
