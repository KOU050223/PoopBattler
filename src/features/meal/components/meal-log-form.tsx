"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { CalendarClock, CheckCircle2, ChevronDown, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { MealPhotoPicker } from "./meal-photo-picker";
import { MealSaveConfirmationModal } from "./meal-save-confirmation-modal";
import { MealTagSelector } from "./meal-tag-selector";
import { deleteMealPhoto, isMealPhotoStorageError, saveMealPhoto } from "@/features/meal/meal-photo-storage";
import { type MealLogDraft, type MealLogSaveResult, type MealTag } from "@/features/meal/meal.types";
import { captionTextClass, fieldClass, secondaryButtonClass } from "@/lib/ui-classes";

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

function compactDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
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
      className="flex flex-col gap-4 sm:gap-5"
      noValidate
      inert={isConfirming}
    >
      <div className="flex flex-col gap-3">
        <p className="meal-field-label">食事の写真 <span aria-hidden="true">*</span></p>
        {previewUrl && (
          <div className="meal-preview">
            <Image src={previewUrl} alt="選択した食事のプレビュー" width={720} height={405} unoptimized className="aspect-[4/3] w-full object-cover sm:aspect-video" />
          </div>
        )}
        <MealPhotoPicker
          autoOpen={autoOpenPicker}
          error={errors.photo}
          hasPhoto={Boolean(photo)}
          onPhotoCleared={() => {
            if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = null;
            setPhoto(null);
            setPreviewUrl(null);
          }}
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

      <details className="meal-date-control">
        <summary><span><CalendarClock aria-hidden="true" className="size-4" />{compactDateTime(eatenAt)}に食べた</span><span className="meal-date-change">変更 <ChevronDown aria-hidden="true" className="size-4" /></span></summary>
        <div className="pt-3">
          <label htmlFor="meal-eaten-at" className="sr-only">食事した日時</label>
          <input id="meal-eaten-at" type="datetime-local" value={eatenAt} onChange={(event) => setEatenAt(event.target.value)} aria-invalid={Boolean(errors.eatenAt)} aria-describedby={errors.eatenAt ? "meal-eaten-at-error" : undefined} className={`${fieldClass} meal-compact-date-input !min-h-10 !shadow-none`} />
          {errors.eatenAt && <p id="meal-eaten-at-error" className="mt-2 text-sm text-red-600">{errors.eatenAt}</p>}
        </div>
      </details>

      <div className="flex flex-col gap-2">
        <label htmlFor="meal-note" className="meal-field-label">メモ <span className={`${captionTextClass} font-medium`}>（任意）</span></label>
        <textarea id="meal-note" value={note} onChange={(event) => setNote(event.target.value)} rows={2} maxLength={500} placeholder="味、量、気になったことなど" className={`${fieldClass} resize-y py-2.5 placeholder:text-pencil-gray/70`} />
      </div>

      {errors.save && <p role="alert" className="text-sm text-red-600">{errors.save}</p>}
      {isComplete && <p role="status" className="meal-success-feedback"><CheckCircle2 aria-hidden="true" className="size-4" />記録しました。次のモンスターが楽しみです。</p>}
      <div className="meal-cta-wrap">
        <button type="submit" disabled={busy} className="meal-save-button"><Sparkles aria-hidden="true" className="size-[18px]" />この食事を記録する</button>
        <p>この食事が、次のモンスターにつながります。</p>
      </div>
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
