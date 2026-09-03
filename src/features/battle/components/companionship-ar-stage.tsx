"use client";

import { useEffect, useRef, useState, type Ref } from "react";
import { motion, useReducedMotion } from "framer-motion";

import type { CompleteBattleResult } from "@/features/battle/actions";
import { BattleCompletionResult } from "@/features/battle/components/battle-completion-result";
import {
  canAdvanceFromStaging,
  companionshipRevealCopy,
  gachaCameraStatusMessage,
  isLiveCameraOverlay,
  nextCompanionshipArPhase,
  shouldCrawlOut,
  shouldPlayThrow,
  type CompanionshipArPhase,
} from "@/features/battle/companionship-ar";
import { useGachaCamera } from "@/features/battle/hooks/use-gacha-camera";
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
};

function phaseLabel(phase: CompanionshipArPhase, acquired: boolean) {
  if (phase === "throw") return "食事を便器へ投げ入れています";
  if (phase === "reveal") {
    return acquired ? "うんちくんが這い出てきます" : "仲間化の結果です";
  }
  return "便器にカメラを向けてください";
}

export function CompanionshipArFrame({
  result,
  mealPhotoUrl,
  phase,
  status,
  reduceMotion,
  onSkip,
  videoRef,
}: CompanionshipArFrameProps) {
  const character = result.acquiredCharacter;
  const acquired = shouldCrawlOut(character);
  const showCamera = phase !== "summary";
  const live = showCamera && isLiveCameraOverlay(status);
  const statusMessage = gachaCameraStatusMessage(status);
  const revealCopy = companionshipRevealCopy({
    acquired,
    usedMealLog: result.usedMealLog,
  });

  if (phase === "summary") {
    return <BattleCompletionResult result={result} />;
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 text-center">
        <p className="text-xl font-bold text-charcoal">{phaseLabel(phase, acquired)}</p>
        <p className={`text-sm ${mutedTextClass}`}>
          仲間化の抽選はすでに確定しています。この画面ではやり直しません。
        </p>
      </div>

      <div className="relative min-h-[22rem] overflow-hidden rounded-2xl border-2 border-faded-gray bg-night-ink shadow-raised-gray aspect-[3/4]">
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

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-night-ink/80 to-transparent" />

        {mealPhotoUrl && (phase === "throw" || phase === "reveal") ? (
          <motion.img
            src={mealPhotoUrl}
            alt="便器へ投げ入れる食事の写真"
            className="absolute left-1/2 top-[12%] z-20 h-28 w-28 rounded-2xl object-cover shadow-raised-gray"
            initial={reduceMotion ? false : { x: "-50%", y: 0, scale: 1, rotate: -8, opacity: 1 }}
            animate={{ x: "-50%", y: "170%", scale: 0.28, rotate: 16, opacity: 0.55 }}
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
  const hasPhoto = shouldPlayThrow(mealPhotoId);

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
    if (phase === "summary") return;
    if (phase === "staging" && !canAdvanceFromStaging(status)) return;

    const delay = reduceMotion
      ? 0
      : phase === "staging"
        ? 700
        : phase === "throw"
          ? 900
          : 1500;

    const timer = window.setTimeout(() => {
      setPhase((current) => nextCompanionshipArPhase(current, hasPhoto));
    }, delay);
    return () => window.clearTimeout(timer);
  }, [hasPhoto, phase, reduceMotion, status]);

  return (
    <CompanionshipArFrame
      result={result}
      mealPhotoUrl={hasPhoto ? mealPhotoUrl : null}
      phase={phase}
      status={status}
      reduceMotion={Boolean(reduceMotion)}
      onSkip={() => setPhase("summary")}
      videoRef={videoRef}
    />
  );
}
