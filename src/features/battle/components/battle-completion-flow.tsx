"use client";

import { useEffect, useRef, useState } from "react";

import {
  completeBattleAction,
  type CompleteBattleResult,
} from "@/features/battle/actions";
import { BattleMealPhotoStep } from "@/features/battle/components/battle-meal-photo-step";
import { saveBattleMealLog } from "@/features/battle/save-battle-meal-log";
import { BowelLogForm } from "@/features/bowel-log/components/bowel-log-form";
import type { BowelLog } from "@/features/bowel-log/bowel-log.types";
import { MEAL_PHOTO_ACCEPT, validateMealPhoto } from "@/features/meal/meal-photo-storage";
import { mutedTextClass } from "@/lib/ui-classes";

type BattleCompletionFlowProps = {
  battleId: string;
  onCompleted: (result: Extract<CompleteBattleResult, { success: true }>) => void;
};

/**
 * 排便の「次へ」と同じタップでファイル選択を開く。
 * getUserMedia は使わない。送信中はボタンを閉じる。
 */
export function BattleCompletionFlow({ battleId, onCompleted }: BattleCompletionFlowProps) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const submittingRef = useRef(false);
  const [bowelLog, setBowelLog] = useState<BowelLog | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [savedMealLogId, setSavedMealLogId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function openPicker() {
    photoInputRef.current?.click();
  }

  function acceptBowelLog(log: BowelLog) {
    setBowelLog(log);
    setError(null);
    openPicker();
  }

  function selectPhoto(selected: File) {
    const validationError = validateMealPhoto(selected);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const nextPreviewUrl = URL.createObjectURL(selected);
    previewUrlRef.current = nextPreviewUrl;
    setPreviewUrl(nextPreviewUrl);
    setPhoto(selected);
    setSavedMealLogId(null);
    setError(null);
  }

  async function finish(mealLogId: string | null) {
    if (!bowelLog || submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    setError(null);

    try {
      const result = await completeBattleAction({
        battleId,
        bowelLog,
        mealLogId,
      });
      if (!result.success) {
        setError(result.message);
        return;
      }
      onCompleted(result);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function sendPhoto() {
    if (!photo || !bowelLog || submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    setError(null);

    try {
      let mealLogId = savedMealLogId;
      if (!mealLogId) {
        const saved = await saveBattleMealLog(photo);
        if (!saved.success) {
          setError(saved.message);
          return;
        }
        mealLogId = saved.mealLogId;
        setSavedMealLogId(mealLogId);
      }

      const result = await completeBattleAction({
        battleId,
        bowelLog,
        mealLogId,
      });
      if (!result.success) {
        setError(result.message);
        return;
      }
      onCompleted(result);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <>
      <input
        ref={photoInputRef}
        type="file"
        accept={MEAL_PHOTO_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        disabled={submitting}
        onChange={(event) => {
          const selected = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (selected) selectPhoto(selected);
        }}
      />

      {bowelLog ? (
        <>
          <BattleMealPhotoStep
            previewUrl={previewUrl}
            submitting={submitting}
            onOpenPicker={openPicker}
            onSkip={() => void finish(null)}
            onSend={() => void sendPhoto()}
          />
          {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
        </>
      ) : (
        <section className="flex flex-col gap-5">
          <div className="flex flex-col gap-1 text-center">
            <p className="text-xl font-bold">勝利！</p>
            <p className={`text-sm ${mutedTextClass}`}>
              排便の状態を記録したあと、食事写真を選べます。写真は任意です。
            </p>
          </div>
          <BowelLogForm onSubmit={acceptBowelLog} />
          {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
        </section>
      )}
    </>
  );
}
