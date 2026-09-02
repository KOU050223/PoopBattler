"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { MealPhotoPicker } from "./meal-photo-picker";
import { MealSaveConfirmationModal } from "./meal-save-confirmation-modal";
import { MealTagSelector } from "./meal-tag-selector";
import { deleteMealPhoto, isMealPhotoStorageError, saveMealPhoto } from "@/features/meal/meal-photo-storage";
import { type MealLogDraft, type MealTag } from "@/features/meal/meal.types";

type FieldErrors = Partial<Record<"photo" | "tag" | "eatenAt" | "save", string>>;

type MealLogFormProps = {
  /**
   * 保存先は呼び出し側が提供する。フォームはSupabaseを直接参照しない。
   */
  onSave: (draft: MealLogDraft) => Promise<void> | void;
};

function currentLocalDateTime() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

export function MealLogForm({ onSave }: MealLogFormProps) {
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
  const [isComplete, setIsComplete] = useState(false);

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

  const save = async () => {
    if (!photo || !tag) return;
    setIsSaving(true);
    setErrors({});
    let photoId: string | undefined;
    try {
      photoId = await saveMealPhoto(photo);
      await onSave({
        photoId,
        eatenAt: new Date(eatenAt).toISOString(),
        tag,
        note: note.trim() || undefined,
      });
      setIsConfirming(false);
      setIsComplete(true);
      router.refresh();
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
        <p className="font-medium">
          食事の写真 <span aria-hidden="true">*</span>
        </p>
        <MealPhotoPicker
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
            className="aspect-video w-full rounded-lg border border-zinc-200 object-cover dark:border-zinc-800"
          />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="meal-eaten-at" className="font-medium">食事した日時</label>
        <input
          id="meal-eaten-at"
          type="datetime-local"
          value={eatenAt}
          onChange={(event) => setEatenAt(event.target.value)}
          aria-invalid={Boolean(errors.eatenAt)}
          aria-describedby={errors.eatenAt ? "meal-eaten-at-error" : undefined}
          className="min-h-11 rounded-md border border-zinc-300 bg-transparent px-3 dark:border-zinc-700"
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
        <label htmlFor="meal-note" className="font-medium">メモ <span className="text-sm font-normal text-zinc-500">（任意）</span></label>
        <textarea id="meal-note" value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={500} className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" />
      </div>

      {errors.save && <p role="alert" className="text-sm text-red-600">{errors.save}</p>}
      {isComplete && <p role="status" className="text-sm text-green-700 dark:text-green-400">入力内容を保存しました。</p>}
      <button type="submit" className="min-h-12 rounded-md bg-zinc-900 px-4 font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-black">
        保存内容を確認する
      </button>

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
