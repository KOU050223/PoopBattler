"use client";

import { useEffect, useId, useRef } from "react";
import { Camera, ImagePlus, Trash2 } from "lucide-react";

import { useMealCamera, type MealCameraStatus } from "@/features/meal/hooks/use-meal-camera";
import { MEAL_PHOTO_ACCEPT, validateMealPhoto } from "@/features/meal/meal-photo-storage";
import { captionTextClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui-classes";

type MealPhotoPickerProps = {
  error?: string;
  autoOpen?: boolean;
  selectLabel?: string;
  hasPhoto?: boolean;
  onPhotoCleared?: () => void;
  onPhotoSelected: (photo: File) => void;
  onValidationError: (message: string) => void;
};

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
export function MealPhotoPicker({
  error,
  autoOpen = false,
  selectLabel = "ファイルを選択する",
  hasPhoto = false,
  onPhotoCleared,
  onPhotoSelected,
  onValidationError,
}: MealPhotoPickerProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { stream, status, start, stop } = useMealCamera();
  const cameraMessage = getCameraMessage(status);

  useEffect(() => {
    if (!autoOpen) return;
    inputRef.current?.click();
  }, [autoOpen]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;
    void video.play().catch(() => undefined);
  }, [stream]);

  const selectPhoto = (photo: File) => {
    const validationError = validateMealPhoto(photo);
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
      {!hasPhoto && status !== "ready" && status !== "starting" && (
        <div className="meal-upload-prompt">
          <Camera aria-hidden="true" className="size-6 text-flush-edge" />
          <p>今日のごはんを見せて</p>
          <span>写真があると、あとで見返すのも楽しくなります。</span>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {status !== "ready" && status !== "starting" && (
          <button type="button" onClick={() => void start()} className="meal-photo-button">
            <Camera aria-hidden="true" className="size-4" />カメラで撮る
          </button>
        )}
        <label htmlFor={inputId} className="meal-photo-button meal-photo-button-primary">
          <ImagePlus aria-hidden="true" className="size-4" />{selectLabel === "ファイルを選択する" ? (hasPhoto ? "写真を変更" : "写真を選ぶ") : selectLabel}
        </label>
        {hasPhoto && onPhotoCleared && <button type="button" onClick={onPhotoCleared} className="meal-text-action"><Trash2 aria-hidden="true" className="size-4" />削除</button>}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={MEAL_PHOTO_ACCEPT}
          className="sr-only"
          onChange={(event) => {
            const photo = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (photo) selectPhoto(photo);
          }}
        />
      </div>

      {(status === "starting" || status === "ready") && (
        <div className="flex flex-col gap-3 rounded-2xl border-2 border-faded-gray bg-paper-white p-3 shadow-raised-gray">
          <video ref={videoRef} playsInline muted className="aspect-video w-full rounded-xl bg-night-ink object-cover" />
          {status === "starting" ? (
            <div className="flex items-center gap-3">
              <p className={captionTextClass}>カメラを起動しています…</p>
              <button type="button" onClick={stop} className={secondaryButtonClass}>カメラを閉じる</button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button type="button" onClick={capturePhoto} className={primaryButtonClass}>撮影する</button>
              <button type="button" onClick={stop} className={secondaryButtonClass}>カメラを閉じる</button>
            </div>
          )}
        </div>
      )}

      {cameraMessage && <p role="status" className={captionTextClass}>{cameraMessage} ファイルを選択して続けられます。</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className={captionTextClass}>JPEG・PNG・WebP、5MB以下</p>
    </div>
  );
}
