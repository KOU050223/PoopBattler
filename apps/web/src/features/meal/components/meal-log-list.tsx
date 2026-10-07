"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2 } from "lucide-react";

import { MealLogImage } from "./meal-log-image";
import { deleteMealPhoto, saveMealPhoto, validateMealPhoto } from "@/features/meal/meal-photo-storage";
import type { MealLog } from "@/features/meal/actions";
import { getMealFoodGroupLabel } from "@/features/meal/meal.types";
import { captionTextClass, secondaryButtonClass } from "@/lib/ui-classes";

type MealLogListProps = {
  initialLogs: MealLog[];
  onDelete: (mealLogId: unknown) => Promise<string>;
  onReplacePhoto: (mealLogId: unknown, photoId: unknown) => Promise<string>;
};

function formatEatenAt(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
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
    <section aria-labelledby="saved-meal-logs" className="meal-recent-section">
      <div className="meal-recent-heading">
        <div>
          <h2 id="saved-meal-logs">最近のごはん</h2>
          <p>記録した食事を見返せます。</p>
        </div>
        {initialLogs.length > 0 && <span>{initialLogs.length}件</span>}
      </div>
      {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
      {cleanupPhotoId && <button type="button" onClick={() => void retryPhotoCleanup()} className={secondaryButtonClass}>端末内画像の削除を再試行する</button>}
      <input ref={replaceInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void replacePhoto(event)} />
      {initialLogs.length === 0 ? (
        <div className="meal-empty-state">
          <p className="font-bold text-charcoal">まだ食事の記録はありません。</p>
          <p className={captionTextClass}>最初の一枚を登録すると、ここに並びます。</p>
        </div>
      ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
          {initialLogs.map((mealLog) => (
          <li key={mealLog.id} className="meal-log-card">
            <div className="meal-log-card-image"><MealLogImage photoId={mealLog.photoId} /></div>
            <div className="meal-log-card-content">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-charcoal">{mealLog.foodGroups.map(getMealFoodGroupLabel).join("・")}</p>
                  <p className={captionTextClass}>{formatEatenAt(mealLog.eatenAt)}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-1">{mealLog.foodGroups.map((foodGroup) => <span key={foodGroup} className="meal-log-tag">{getMealFoodGroupLabel(foodGroup)}</span>)}</div>
              </div>
              {mealLog.note && <p className="mt-2 text-sm leading-relaxed text-charcoal">{mealLog.note}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <button type="button" disabled={pendingId === mealLog.id} onClick={() => { setSelectedLog(mealLog); replaceInputRef.current?.click(); }} className="meal-inline-action"><ImagePlus aria-hidden="true" className="size-4" />写真を変更</button>
                <button type="button" disabled={pendingId === mealLog.id} onClick={() => void deleteLog(mealLog)} className="meal-inline-delete"><Trash2 aria-hidden="true" className="size-4" />削除</button>
              </div>
            </div>
          </li>
          ))}
        </ul>
      )}
    </section>
  );
}
