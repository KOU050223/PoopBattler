"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { MealPhotoPicker } from "./meal-photo-picker";
import { MealSaveConfirmationModal } from "./meal-save-confirmation-modal";
import { MealTagSelector } from "./meal-tag-selector";
import { deleteMealPhoto, isMealPhotoStorageError, saveMealPhoto } from "@/features/meal/meal-photo-storage";
import { type MealLogDraft, type MealLogSaveResult, type MealTag } from "@/features/meal/meal.types";
import { captionTextClass, fieldClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui-classes";

type FieldErrors = Partial<Record<"photo" | "tag" | "eatenAt" | "save", string>>;

type MealLogFormProps = {
  /**
   * 保存先は呼び出し側が提供する。フォームはSupabaseを直接参照しない。
   */
  onSave: (draft: MealLogDraft) => Promise<MealLogSaveResult>;
  /** 戦闘後など、食事を残さずに先へ進むとき。未指定ならスキップボタンは出さない。 */
  onSkip?: () => void | Promise<void>;
  skipLabel?: string;
  autoOpenPicker?: boolean;
  refreshOnSuccess?: boolean;
  /** 1より大きいとき、戦闘後ガチャとして写真を複数枚選べる。 */
  maxPhotos?: number;
  /** 枚数に応じた説明。戦闘後ガチャの確率表示に使う。 */
  photoCountHint?: (photoCount: number) => string;
};

function currentLocalDateTime() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

export function MealLogForm({
  onSave,
  onSkip,
  skipLabel = "記録せずに完了する",
  autoOpenPicker = false,
  refreshOnSuccess = true,
  maxPhotos = 1,
  photoCountHint,
}: MealLogFormProps) {
  const router = useRouter();
  const tagGroupId = useId();
  const previewUrlsRef = useRef<string[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [eatenAt, setEatenAt] = useState(currentLocalDateTime);
  const [tag, setTag] = useState<MealTag | "">("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const busy = isSaving || isSkipping;
  const allowMultiple = maxPhotos > 1;
  const photoHint = photoCountHint?.(photos.length);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const validate = () => {
    const nextErrors: FieldErrors = {};
    if (photos.length === 0) nextErrors.photo = "写真を選択してください。";
    if (!tag) nextErrors.tag = "食事タグを1つ選択してください。";
    if (!eatenAt || Number.isNaN(new Date(eatenAt).getTime())) {
      nextErrors.eatenAt = "食事した日時を入力してください。";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const addPhoto = (selectedPhoto: File) => {
    if (previewUrlsRef.current.length >= maxPhotos) return;
    const nextPreviewUrl = URL.createObjectURL(selectedPhoto);
    if (!allowMultiple) {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current = [nextPreviewUrl];
      setPreviewUrls([nextPreviewUrl]);
      setPhotos([selectedPhoto]);
    } else {
      previewUrlsRef.current = [...previewUrlsRef.current, nextPreviewUrl];
      setPreviewUrls(previewUrlsRef.current);
      setPhotos((current) => [...current, selectedPhoto]);
    }
    setErrors((current) => ({ ...current, photo: undefined }));
  };

  const removePhoto = (index: number) => {
    const url = previewUrlsRef.current[index];
    if (url) URL.revokeObjectURL(url);
    previewUrlsRef.current = previewUrlsRef.current.filter((_, photoIndex) => photoIndex !== index);
    setPreviewUrls(previewUrlsRef.current);
    setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index));
  };

  const requestConfirmation = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsComplete(false);
    if (validate()) setIsConfirming(true);
  };

  const resetForm = () => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current = [];
    setPhotos([]);
    setPreviewUrls([]);
    setEatenAt(currentLocalDateTime());
    setTag("");
    setNote("");
  };

  const save = async () => {
    if (photos.length === 0 || !tag) return;
    setIsSaving(true);
    setErrors({});
    const savedPhotoIds: string[] = [];
    try {
      for (const photo of photos) {
        savedPhotoIds.push(await saveMealPhoto(photo));
      }
      const result = await onSave({
        photoId: savedPhotoIds[0]!,
        photoIds: savedPhotoIds,
        eatenAt: new Date(eatenAt).toISOString(),
        tag,
        note: note.trim() || undefined,
      });
      if (!result.success) {
        await Promise.all(savedPhotoIds.map((photoId) => deleteMealPhoto(photoId).catch(() => undefined)));
        setErrors({ save: result.message });
        setIsConfirming(false);
        return;
      }
      setIsConfirming(false);
      setIsComplete(true);
      resetForm();
      if (refreshOnSuccess) router.refresh();
    } catch (error) {
      await Promise.all(savedPhotoIds.map((photoId) => deleteMealPhoto(photoId).catch(() => undefined)));
      setErrors({
        save: isMealPhotoStorageError(error)
          ? error.message
          : "食事ログの保存に失敗しました。通信環境を確認して再試行してください。",
      });
      setIsConfirming(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={requestConfirmation}
      className="flex max-w-md flex-col gap-6"
      noValidate
      inert={isConfirming}
    >
      <div className="flex flex-col gap-2">
        <p className="font-bold text-charcoal">
          食事の写真 <span aria-hidden="true">*</span>
        </p>
        {photoHint ? <p className={captionTextClass}>{photoHint}</p> : null}
        {(!allowMultiple || photos.length < maxPhotos) ? (
          <MealPhotoPicker
            autoOpen={autoOpenPicker && photos.length === 0}
            error={errors.photo}
            selectLabel={allowMultiple && photos.length > 0 ? "写真を追加する" : "ファイルを選択する"}
            onPhotoSelected={addPhoto}
            onValidationError={(message) => setErrors((current) => ({ ...current, photo: message }))}
          />
        ) : null}
        {previewUrls.map((previewUrl, index) => (
          <div key={previewUrl} className="flex flex-col gap-2">
            <Image
              src={previewUrl}
              alt={`選択した食事のプレビュー ${index + 1}`}
              width={720}
              height={405}
              unoptimized
              className="aspect-video w-full rounded-2xl border-2 border-faded-gray object-cover shadow-raised-gray"
            />
            {allowMultiple ? (
              <button type="button" className={secondaryButtonClass} onClick={() => removePhoto(index)}>
                この写真を外す
              </button>
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="meal-eaten-at" className="font-bold text-charcoal">食事した日時</label>
        <input
          id="meal-eaten-at"
          type="datetime-local"
          value={eatenAt}
          onChange={(event) => setEatenAt(event.target.value)}
          aria-invalid={Boolean(errors.eatenAt)}
          aria-describedby={errors.eatenAt ? "meal-eaten-at-error" : undefined}
          className={fieldClass}
        />
        {errors.eatenAt && <p id="meal-eaten-at-error" className="text-sm text-red-600">{errors.eatenAt}</p>}
      </div>

      <MealTagSelector
        value={tag}
        error={errors.tag}
        errorId={`${tagGroupId}-error`}
        onChange={(selectedTag) => {
          setTag(selectedTag);
          setErrors((current) => ({ ...current, tag: undefined }));
        }}
      />

      <div className="flex flex-col gap-2">
        <label htmlFor="meal-note" className="font-bold text-charcoal">メモ <span className={`${captionTextClass} font-medium`}>（任意）</span></label>
        <textarea id="meal-note" value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={500} className={`${fieldClass} py-2`} />
      </div>

      {errors.save && <p role="alert" className="text-sm text-red-600">{errors.save}</p>}
      {isComplete && <p role="status" className="text-sm font-medium text-spark-blue">入力内容を保存しました。</p>}
      <button type="submit" disabled={busy} className={primaryButtonClass}>
        保存内容を確認する
      </button>
      {onSkip ? (
        <button
          type="button"
          disabled={busy}
          className={secondaryButtonClass}
          onClick={() => {
            setIsSkipping(true);
            setErrors({});
            void Promise.resolve(onSkip()).finally(() => setIsSkipping(false));
          }}
        >
          {isSkipping ? "送信しています…" : skipLabel}
        </button>
      ) : null}

      {tag && (
        <MealSaveConfirmationModal
          isOpen={isConfirming}
          tag={tag}
          isSaving={isSaving}
          photoHint={allowMultiple ? photoHint : undefined}
          onCancel={() => setIsConfirming(false)}
          onConfirm={() => void save()}
        />
      )}
    </form>
  );
}
