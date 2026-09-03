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
}: MealLogFormProps) {
  const router = useRouter();
  const tagGroupId = useId();
  const previewUrlRef = useRef<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [eatenAt, setEatenAt] = useState(currentLocalDateTime);
  const [tag, setTag] = useState<MealTag | "">("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const busy = isSaving || isSkipping;

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const validate = () => {
    const nextErrors: FieldErrors = {};
    if (!photo) nextErrors.photo = "写真を選択してください。";
    if (!tag) nextErrors.tag = "食事タグを1つ選択してください。";
    if (!eatenAt || Number.isNaN(new Date(eatenAt).getTime())) {
      nextErrors.eatenAt = "食事した日時を入力してください。";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const requestConfirmation = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsComplete(false);
    if (validate()) setIsConfirming(true);
  };

  const resetForm = () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPhoto(null);
    setPreviewUrl(null);
    setEatenAt(currentLocalDateTime());
    setTag("");
    setNote("");
  };

  const save = async () => {
    if (!photo || !tag) return;
    setIsSaving(true);
    setErrors({});
    let photoId: string | undefined;
    try {
      photoId = await saveMealPhoto(photo);
      const result = await onSave({
        photoId,
        eatenAt: new Date(eatenAt).toISOString(),
        tag,
        note: note.trim() || undefined,
      });
      if (!result.success) {
        await deleteMealPhoto(photoId).catch(() => undefined);
        setErrors({ save: result.message });
        setIsConfirming(false);
        return;
      }
      setIsConfirming(false);
      setIsComplete(true);
      resetForm();
      if (refreshOnSuccess) router.refresh();
    } catch (error) {
      if (photoId) await deleteMealPhoto(photoId).catch(() => undefined);
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
        <MealPhotoPicker
          autoOpen={autoOpenPicker}
          error={errors.photo}
          onPhotoSelected={(selectedPhoto) => {
            if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
            const nextPreviewUrl = URL.createObjectURL(selectedPhoto);
            previewUrlRef.current = nextPreviewUrl;
            setPreviewUrl(nextPreviewUrl);
            setPhoto(selectedPhoto);
            setErrors((current) => ({ ...current, photo: undefined }));
          }}
          onValidationError={(message) => setErrors((current) => ({ ...current, photo: message }))}
        />
        {previewUrl && (
          <Image
            src={previewUrl}
            alt="選択した食事のプレビュー"
            width={720}
            height={405}
            unoptimized
            className="aspect-video w-full rounded-2xl border-2 border-faded-gray object-cover shadow-raised-gray"
          />
        )}
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
          onCancel={() => setIsConfirming(false)}
          onConfirm={() => void save()}
        />
      )}
    </form>
  );
}
