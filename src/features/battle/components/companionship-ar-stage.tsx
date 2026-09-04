"use client";

import { useEffect, useRef, useState, type PointerEvent, type Ref } from "react";
import { motion, useReducedMotion } from "framer-motion";

import type { CompleteBattleResult } from "@/features/battle/actions";
import { BattleCompletionResult } from "@/features/battle/components/battle-completion-result";
import {
  canStartGachaBySwipe,
  clientPointFromPercent,
  companionshipPhaseDelay,
  companionshipRevealCopy,
  gachaCameraStatusMessage,
  GACHA_SWIPE_MIN_DISTANCE_PX,
  isLiveCameraOverlay,
  isThrowSwipe,
  nextCompanionshipArPhase,
  shouldCrawlOut,
  shouldPlayThrow,
  VIDEO_SHAKE_ANIMATE,
  VIDEO_SHAKE_TRANSITION,
  type CompanionshipArPhase,
} from "@/features/battle/companionship-ar";
import { useGachaCamera } from "@/features/battle/hooks/use-gacha-camera";
import { useGravityFloorAngle } from "@/features/battle/hooks/use-gravity-floor";
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
  floorAngleDeg?: number;
  aimPoint?: PercentPoint | null;
  onAim?: (point: PercentPoint) => void;
  onThrowStart?: () => void;
};

const CONFETTI_PIECES = [
  { x: 10, delay: 0, color: "#ff7aac", w: 8, h: 12, rot: 22 },
  { x: 22, delay: 0.04, color: "#1cb0f6", w: 7, h: 11, rot: -16 },
  { x: 34, delay: 0.08, color: "#ffb3d0", w: 9, h: 10, rot: 8 },
  { x: 46, delay: 0.02, color: "#ffffff", w: 6, h: 12, rot: -28 },
  { x: 58, delay: 0.1, color: "#ff7aac", w: 8, h: 9, rot: 14 },
  { x: 70, delay: 0.06, color: "#1cb0f6", w: 7, h: 13, rot: -10 },
  { x: 82, delay: 0.12, color: "#ffb3d0", w: 8, h: 11, rot: 26 },
  { x: 16, delay: 0.16, color: "#ffffff", w: 6, h: 10, rot: -6 },
  { x: 40, delay: 0.18, color: "#ff7aac", w: 9, h: 8, rot: 18 },
  { x: 64, delay: 0.14, color: "#1cb0f6", w: 7, h: 12, rot: -22 },
  { x: 88, delay: 0.2, color: "#c94d7f", w: 8, h: 10, rot: 12 },
  { x: 28, delay: 0.22, color: "#ffffff", w: 6, h: 11, rot: -14 },
] as const;

function phaseLabel(phase: CompanionshipArPhase, canSwipe: boolean) {
  if (phase === "throw") return "食事を便器へ投げ入れています";
  if (phase === "shake") return "便器が揺れています";
  if (phase === "reveal") return "仲間化の結果です";
  return canSwipe ? "スワイプして食事を投げ入れてください" : "便器にカメラを向けてください";
}

function RevealConfetti({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <div aria-hidden="true" data-confetti="true" className="pointer-events-none absolute inset-0 z-[35] overflow-hidden">
      {CONFETTI_PIECES.map((piece, index) => (
        <motion.span
          key={index}
          className="absolute top-[-8%] rounded-sm"
          style={{
            left: `${piece.x}%`,
            width: piece.w,
            height: piece.h,
            backgroundColor: piece.color,
          }}
          initial={reduceMotion ? false : { y: "-8%", rotate: piece.rot, opacity: 1 }}
          animate={{ y: "118%", rotate: piece.rot + 120, opacity: 0.15 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 1.15, delay: piece.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
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
  floorAngleDeg = 0,
  aimPoint = null,
  onAim,
  onThrowStart,
}: CompanionshipArFrameProps) {
  const character = result.acquiredCharacter;
  const acquired = shouldCrawlOut(character);
  const showCamera = phase !== "summary";
  const live = showCamera && isLiveCameraOverlay(status);
  const shaking = phase === "shake" && !reduceMotion;
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
        <p className="text-xl font-bold text-charcoal">{phaseLabel(phase, canSwipe)}</p>
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
        <motion.div
          className="pointer-events-none absolute -inset-[8%]"
          data-video-shake={shaking ? "on" : "off"}
          animate={shaking ? VIDEO_SHAKE_ANIMATE : { x: 0, y: 0, rotate: 0 }}
          transition={shaking ? VIDEO_SHAKE_TRANSITION : { duration: 0 }}
        >
          {live ? (
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              aria-label="便器に向けたカメラ"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(circle_at_50%_78%,var(--color-blush-wash)_0%,transparent_42%),linear-gradient(180deg,#1a1d3a_0%,var(--color-night-ink)_100%)]"
            />
          )}
        </motion.div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-2/5 bg-gradient-to-t from-night-ink/80 to-transparent" />

        <ToiletDebugOverlay sight={toiletSight} />

        {aimPoint && toiletSight.kind !== "hit" ? (
          <div
            aria-hidden="true"
            data-aim-point="true"
            className="pointer-events-none absolute z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper-white"
            style={{ left: `${aimPoint.x}%`, top: `${aimPoint.y}%` }}
          />
        ) : null}

        {mealPhotoUrl && phase === "throw" ? (
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

        {phase === "reveal" && acquired ? <RevealConfetti reduceMotion={reduceMotion} /> : null}

        {phase === "reveal" && acquired && character ? (
          <div
            className="pointer-events-none absolute z-30"
            data-spawn-x={throwTarget.x.toFixed(1)}
            data-spawn-y={throwTarget.y.toFixed(1)}
            style={{
              left: `${throwTarget.x}%`,
              top: `${throwTarget.y}%`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div
              data-gravity-floor="true"
              data-gravity-angle={floorAngleDeg.toFixed(1)}
              style={{ transform: `rotate(${floorAngleDeg}deg)`, transformOrigin: "50% 100%" }}
            >
              <motion.div
                initial={reduceMotion ? false : { scale: 0.72 }}
                animate={{ scale: 1 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
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
          </div>
        ) : null}

        {phase === "reveal" ? (
          <p
            role="status"
            data-reveal-result={acquired ? "success" : "fail"}
            className={`absolute inset-x-3 top-4 z-40 text-center text-3xl font-black ${
              acquired ? "text-flush-pink" : "text-charcoal"
            }`}
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
  const floorAngleDeg = useGravityFloorAngle();
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
    const delay = companionshipPhaseDelay(phase, Boolean(reduceMotion));
    if (delay == null) return;
    const timer = window.setTimeout(() => {
      setPhase((current) => nextCompanionshipArPhase(current, hasPhoto, Boolean(reduceMotion)));
    }, delay);
    return () => window.clearTimeout(timer);
  }, [hasPhoto, phase, reduceMotion]);

  function startThrowFromSwipe() {
    setHeldTarget(liveTargetRef.current);
    setPhase((current) => nextCompanionshipArPhase(current, hasPhoto, Boolean(reduceMotion)));
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
      floorAngleDeg={floorAngleDeg}
      aimPoint={aimPoint}
      onAim={setAimPoint}
      onThrowStart={startThrowFromSwipe}
    />
  );
}
