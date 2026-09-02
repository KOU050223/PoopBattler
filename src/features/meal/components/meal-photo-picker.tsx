"use client";

import { useEffect, useId, useRef } from "react";

import { useMealCamera, type MealCameraStatus } from "@/features/meal/hooks/use-meal-camera";

export const MEAL_PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MEAL_PHOTO_ACCEPT = MEAL_PHOTO_MIME_TYPES.join(",");
// IndexedDBへ保存するローカル画像の上限。UI側の単一の定義元として扱う。
export const MEAL_PHOTO_MAX_SIZE_BYTES = 5 * 1024 * 1024;

type MealPhotoPickerProps = {
  error?: string;
  onPhotoSelected: (photo: File) => void;
  onValidationError: (message: string) => void;
};

function validatePhoto(photo: File) {
  if (!MEAL_PHOTO_MIME_TYPES.includes(photo.type as (typeof MEAL_PHOTO_MIME_TYPES)[number])) {
    return "JPEG、PNG、WebPの画像を選択してください。";
  }
  if (photo.size > MEAL_PHOTO_MAX_SIZE_BYTES) {
    return "画像は5MB以下にしてください。";
  }
  return undefined;
}

function getCameraMessage(status: MealCameraStatus) {
  const messages: Partial<Record<MealCameraStatus, string>> = {
    insecure: "カメラはHTTPS環境でのみ利用できます。",
    unsupported: "このブラウザはカメラ撮影に対応していません。",
    denied: "カメラの利用が許可されませんでした。",
    busy: "カメラは他のアプリケーションで使用中です。",
    unavailable: "利用できるカメラが見つかりませんでした。",
    error: "カメラを起動できませんでした。",
  };

  return messages[status];
}

/** 端末カメラ撮影とファイル選択を同じ検証ルールでフォームへ渡す。 */
export function MealPhotoPicker({ error, onPhotoSelected, onValidationError }: MealPhotoPickerProps) {
  const inputId = useId();
  const videoRef = useRef<HTMLVideoElement>(null);
  const { stream, status, start, stop } = useMealCamera();
  const cameraMessage = getCameraMessage(status);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;
    void video.play().catch(() => undefined);
  }, [stream]);

  const selectPhoto = (photo: File) => {
    const validationError = validatePhoto(photo);
    if (validationError) {
      onValidationError(validationError);
      return;
    }

    stop();
    onPhotoSelected(photo);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      onValidationError("カメラ映像の準備ができてから撮影してください。");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          onValidationError("写真の作成に失敗しました。もう一度撮影してください。");
          return;
        }
        selectPhoto(new File([blob], `meal-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        {status !== "ready" && status !== "starting" && (
          <button type="button" onClick={() => void start()} className="min-h-11 rounded-md border border-zinc-300 px-4 font-medium dark:border-zinc-700">
            カメラで撮影する
          </button>
        )}
        <label htmlFor={inputId} className="flex min-h-11 cursor-pointer items-center rounded-md bg-zinc-900 px-4 font-medium text-white dark:bg-zinc-100 dark:text-black">
          ファイルを選択する
        </label>
        <input
          id={inputId}
          type="file"
          accept={MEAL_PHOTO_ACCEPT}
          className="sr-only"
          onChange={(event) => {
            const photo = event.currentTarget.files?.[0];
            if (photo) selectPhoto(photo);
          }}
        />
      </div>

      {(status === "starting" || status === "ready") && (
        <div className="flex flex-col gap-3 rounded-lg border border-zinc-300 p-3 dark:border-zinc-700">
          <video ref={videoRef} playsInline muted className="aspect-video w-full rounded-md bg-black object-cover" />
          {status === "starting" ? (
            <div className="flex items-center gap-3">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">カメラを起動しています…</p>
              <button type="button" onClick={stop} className="min-h-11 rounded-md border border-zinc-300 px-4 dark:border-zinc-700">カメラを閉じる</button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button type="button" onClick={capturePhoto} className="min-h-11 rounded-md bg-zinc-900 px-4 font-medium text-white dark:bg-zinc-100 dark:text-black">撮影する</button>
              <button type="button" onClick={stop} className="min-h-11 rounded-md border border-zinc-300 px-4 dark:border-zinc-700">カメラを閉じる</button>
            </div>
          )}
        </div>
      )}

      {cameraMessage && <p role="status" className="text-sm text-zinc-600 dark:text-zinc-400">{cameraMessage} ファイルを選択して続けられます。</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-zinc-500">JPEG・PNG・WebP、5MB以下</p>
    </div>
  );
}
