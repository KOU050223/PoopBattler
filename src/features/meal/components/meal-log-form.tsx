"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

import {
  MEAL_TAGS,
  type MealLogDraft,
  type MealTag,
} from "@/features/meal/meal.types";

const supportedPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

type FieldErrors = Partial<Record<"photo" | "tag" | "eatenAt" | "save", string>>;

type MealLogFormProps = {
  /**
   * 保存先は呼び出し側が提供する。フォームはSupabaseやStorageを直接参照しない。
   */
  onSave?: (draft: MealLogDraft) => Promise<void> | void;
};

function currentLocalDateTime() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

function validatePhoto(photo: File | null) {
  if (!photo) return "写真を選択してください。";
  if (!supportedPhotoTypes.has(photo.type)) {
    return "JPEG、PNG、WebPの画像を選択してください。";
  }
  return undefined;
}

export function MealLogForm({ onSave }: MealLogFormProps) {
  const photoInputId = useId();
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
    const photoError = validatePhoto(photo);
    if (photoError) nextErrors.photo = photoError;
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
    if (!onSave) {
      setErrors({ save: "保存処理はまだ接続されていません。" });
      setIsConfirming(false);
      return;
    }

    setIsSaving(true);
    setErrors({});
    try {
      await onSave({
        photo,
        eatenAt: new Date(eatenAt).toISOString(),
        tag,
        note: note.trim() || undefined,
      });
      setIsConfirming(false);
      setIsComplete(true);
    } catch {
      setErrors({ save: "保存に失敗しました。通信環境を確認して再試行してください。" });
      setIsConfirming(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={requestConfirmation} className="flex max-w-md flex-col gap-6" noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor={photoInputId} className="font-medium">
          食事の写真 <span aria-hidden="true">*</span>
        </label>
        <input
          id={photoInputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-describedby={errors.photo ? `${photoInputId}-error` : undefined}
          aria-invalid={Boolean(errors.photo)}
          onChange={(event) => {
            const selectedPhoto = event.currentTarget.files?.[0] ?? null;
            if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
            const nextPreviewUrl = selectedPhoto ? URL.createObjectURL(selectedPhoto) : null;
            previewUrlRef.current = nextPreviewUrl;
            setPreviewUrl(nextPreviewUrl);
            setPhoto(selectedPhoto);
            setErrors((current) => ({ ...current, photo: validatePhoto(selectedPhoto) }));
          }}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white dark:file:bg-zinc-100 dark:file:text-black"
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
        {errors.photo && <p id={`${photoInputId}-error`} className="text-sm text-red-600">{errors.photo}</p>}
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

      <fieldset className="flex flex-col gap-3" aria-describedby={errors.tag ? `${tagGroupId}-error` : undefined}>
        <legend className="font-medium">食事タグ <span aria-hidden="true">*</span></legend>
        <div className="grid grid-cols-2 gap-2">
          {MEAL_TAGS.map((mealTag) => (
            <label key={mealTag.value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-zinc-300 px-3 has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-100 dark:border-zinc-700 dark:has-[:checked]:border-zinc-100 dark:has-[:checked]:bg-zinc-900">
              <input type="radio" name="meal-tag" value={mealTag.value} checked={tag === mealTag.value} onChange={() => { setTag(mealTag.value); setErrors((current) => ({ ...current, tag: undefined })); }} />
              {mealTag.label}
            </label>
          ))}
        </div>
        {errors.tag && <p id={`${tagGroupId}-error`} className="text-sm text-red-600">{errors.tag}</p>}
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="meal-note" className="font-medium">メモ <span className="text-sm font-normal text-zinc-500">（任意）</span></label>
        <textarea id="meal-note" value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={500} className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" />
      </div>

      {errors.save && <p role="alert" className="text-sm text-red-600">{errors.save}</p>}
      {isComplete && <p role="status" className="text-sm text-green-700 dark:text-green-400">入力内容を保存しました。</p>}
      <button type="submit" className="min-h-12 rounded-md bg-zinc-900 px-4 font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-black">
        保存内容を確認する
      </button>

      {isConfirming && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="meal-confirmation-title" className="w-full max-w-sm rounded-lg border border-zinc-300 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-black">
            <h2 id="meal-confirmation-title" className="font-semibold">この内容で保存しますか？</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{MEAL_TAGS.find((mealTag) => mealTag.value === tag)?.label}として記録します。</p>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setIsConfirming(false)} disabled={isSaving} className="min-h-11 rounded-md border border-zinc-300 px-4 dark:border-zinc-700">戻る</button>
              <button type="button" onClick={() => void save()} disabled={isSaving} className="min-h-11 rounded-md bg-zinc-900 px-4 font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-black">{isSaving ? "保存中…" : "保存する"}</button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
