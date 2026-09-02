"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { MealLogImage } from "./meal-log-image";
import { deleteMealPhoto, saveMealPhoto, validateMealPhoto } from "@/features/meal/meal-photo-storage";
import type { MealLog } from "@/features/meal/actions";
import { MEAL_TAGS } from "@/features/meal/meal.types";

type MealLogListProps = {
  initialLogs: MealLog[];
  onDelete: (mealLogId: unknown) => Promise<string>;
  onReplacePhoto: (mealLogId: unknown, photoId: unknown) => Promise<string>;
};

function formatEatenAt(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function getTagLabel(tag: string) {
  return MEAL_TAGS.find((item) => item.value === tag)?.label ?? tag;
}

export function MealLogList({ initialLogs, onDelete, onReplacePhoto }: MealLogListProps) {
  const router = useRouter();
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [selectedLog, setSelectedLog] = useState<MealLog>();
  const [pendingId, setPendingId] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [cleanupPhotoId, setCleanupPhotoId] = useState<string>();

  const retryPhotoCleanup = async () => {
    if (!cleanupPhotoId) return;

    try {
      await deleteMealPhoto(cleanupPhotoId);
      setCleanupPhotoId(undefined);
      setMessage("端末内の不要な画像を削除しました。");
    } catch {
      setMessage("端末内の画像を削除できませんでした。もう一度お試しください。");
    }
  };

  const replacePhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const photo = event.currentTarget.files?.[0];
    const mealLog = selectedLog;
    event.currentTarget.value = "";
    if (!photo || !mealLog) return;

    const validationError = validateMealPhoto(photo);
    if (validationError) {
      setMessage(validationError);
      return;
    }

    setPendingId(mealLog.id);
    setMessage(undefined);
    let newPhotoId: string | undefined;
    try {
      newPhotoId = await saveMealPhoto(photo);
      const previousPhotoId = await onReplacePhoto(mealLog.id, newPhotoId);
      try {
        await deleteMealPhoto(previousPhotoId);
      } catch {
        setCleanupPhotoId(previousPhotoId);
        setMessage("写真は差し替えましたが、以前の端末内画像を削除できませんでした。");
      }
      router.refresh();
    } catch {
      if (newPhotoId) {
        try {
          await deleteMealPhoto(newPhotoId);
        } catch {
          setCleanupPhotoId(newPhotoId);
        }
      }
      setMessage("食事写真の差し替えに失敗しました。もう一度お試しください。");
    } finally {
      setPendingId(undefined);
      setSelectedLog(undefined);
    }
  };

  const deleteLog = async (mealLog: MealLog) => {
    if (!window.confirm("この食事ログを削除しますか？")) return;

    setPendingId(mealLog.id);
    setMessage(undefined);
    try {
      const photoId = await onDelete(mealLog.id);
      try {
        await deleteMealPhoto(photoId);
      } catch {
        setCleanupPhotoId(photoId);
        setMessage("食事ログは削除しましたが、端末内画像を削除できませんでした。");
      }
      router.refresh();
    } catch {
      setMessage("食事ログの削除に失敗しました。もう一度お試しください。");
    } finally {
      setPendingId(undefined);
    }
  };

  return (
    <section aria-labelledby="saved-meal-logs" className="flex flex-col gap-4">
      <h2 id="saved-meal-logs" className="text-lg font-semibold">保存済みの食事ログ</h2>
      {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
      {cleanupPhotoId && <button type="button" onClick={() => void retryPhotoCleanup()} className="min-h-11 self-start rounded-md border border-zinc-300 px-3 text-sm dark:border-zinc-700">端末内画像の削除を再試行する</button>}
      <input ref={replaceInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void replacePhoto(event)} />
      {initialLogs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">保存済みの食事ログはありません。</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {initialLogs.map((mealLog) => (
          <li key={mealLog.id} className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <MealLogImage photoId={mealLog.photoId} />
            <div>
              <p className="font-medium">{getTagLabel(mealLog.tag)}</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{formatEatenAt(mealLog.eatenAt)}</p>
              {mealLog.note && <p className="mt-2 text-sm">{mealLog.note}</p>}
            </div>
            <div className="flex gap-3">
              <button type="button" disabled={pendingId === mealLog.id} onClick={() => { setSelectedLog(mealLog); replaceInputRef.current?.click(); }} className="min-h-11 rounded-md border border-zinc-300 px-3 text-sm disabled:opacity-50 dark:border-zinc-700">写真を差し替える</button>
              <button type="button" disabled={pendingId === mealLog.id} onClick={() => void deleteLog(mealLog)} className="min-h-11 rounded-md border border-red-300 px-3 text-sm text-red-700 disabled:opacity-50">削除する</button>
            </div>
          </li>
          ))}
        </ul>
      )}
    </section>
  );
}
