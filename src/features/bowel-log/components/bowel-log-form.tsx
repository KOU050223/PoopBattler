"use client";

import { useId, useState } from "react";
import { Check } from "lucide-react";

import {
  BOWEL_AMOUNT_OPTIONS,
  BOWEL_COLOR_OPTIONS,
  BOWEL_EASE_OPTIONS,
  BOWEL_HARDNESS_OPTIONS,
  isBowelLog,
  type BowelColor,
  type BowelLog,
  type BowelLogDraft,
} from "../bowel-log.types";
import { useBattleStore } from "@/stores/battle-store";

type BowelLogFormProps = {
  onSubmit: (log: BowelLog) => void | Promise<void>;
};

type FieldName = keyof BowelLog;
type FieldErrors = Partial<Record<FieldName | "submit", string>>;

const REQUIRED_FIELD_MESSAGES: Record<FieldName, string> = {
  hardness: "硬さを選択してください。",
  amount: "量を選択してください。",
  color: "色を選択してください。",
  ease: "出やすさを選択してください。",
};

const colorSwatchClass: Record<BowelColor, string> = {
  brown: "bg-[#8a572f]",
  dark_brown: "bg-[#50301f]",
  yellow: "bg-[#d7aa35]",
  green: "bg-[#4e8a59]",
};

const segmentedControlClass =
  "flex min-h-10 items-center justify-center rounded-lg border border-faded-gray px-0.5 text-[10px] font-bold shadow-[0_2px_0_var(--color-faded-edge)] transition-[transform,box-shadow,background-color,border-color,color] duration-150 hover:border-flush-pink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flush-pink active:translate-y-px active:shadow-none";
const segmentedControlUnselectedClass = "bg-paper-white text-charcoal";
const segmentedControlSelectedClass =
  "scale-[1.02] border-flush-edge bg-flush-pink text-paper-white shadow-raised-pink ring-2 ring-flush-pink/35 ring-offset-1 ring-offset-blush-wash";

function HardnessField({
  value,
  error,
  disabled,
  onChange,
}: {
  value: BowelLog["hardness"] | undefined;
  error?: string;
  disabled: boolean;
  onChange: (value: BowelLog["hardness"]) => void;
}) {
  const errorId = useId();

  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={error ? errorId : undefined} aria-invalid={Boolean(error)} disabled={disabled}>
      <div className="flex items-baseline justify-between gap-3">
        <legend className="text-[15px] font-bold text-charcoal">硬さ <span aria-hidden="true">*</span></legend>
        <p className="text-xs font-medium text-pencil-gray">硬い ← → ゆるい</p>
      </div>
      <div className="grid grid-cols-7 gap-1.5" aria-label="硬さは1が硬く、7がゆるい">
        {BOWEL_HARDNESS_OPTIONS.map((option) => {
          const inputId = `hardness-${option.value}`;
          const selected = value === option.value;
          return (
            <div key={option.value}>
              <input id={inputId} name="hardness" type="radio" value={option.value} checked={selected} onChange={() => onChange(option.value)} className="peer sr-only" />
              <label htmlFor={inputId} aria-label={option.label} className={`${segmentedControlClass} min-w-0 px-0 text-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-flush-pink peer-disabled:cursor-not-allowed peer-disabled:opacity-50 ${selected ? segmentedControlSelectedClass : segmentedControlUnselectedClass}`}>
                {option.value}
              </label>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-3 text-[11px] font-medium text-pencil-gray" aria-hidden="true">
        <span>1 硬い</span><span className="text-center">4 ふつう</span><span className="text-right">7 ゆるい</span>
      </div>
      {error ? <p id={errorId} className="text-xs font-medium text-red-600">{error}</p> : null}
    </fieldset>
  );
}

function SegmentedField<T extends string>({
  label,
  name,
  options,
  value,
  error,
  disabled,
  onChange,
}: {
  label: string;
  name: "amount" | "ease";
  options: readonly { value: T; label: string }[];
  value: T | undefined;
  error?: string;
  disabled: boolean;
  onChange: (value: T) => void;
}) {
  const errorId = useId();
  return (
    <fieldset className="flex min-w-0 flex-col gap-2" aria-describedby={error ? errorId : undefined} aria-invalid={Boolean(error)} disabled={disabled}>
      <legend className="text-[15px] font-bold text-charcoal">{label} <span aria-hidden="true">*</span></legend>
      <div className="grid grid-cols-3 gap-1">
        {options.map((option) => {
          const inputId = `${name}-${option.value}`;
          const selected = value === option.value;
          return <div key={option.value}>
            <input id={inputId} name={name} type="radio" value={option.value} checked={selected} onChange={() => onChange(option.value)} className="peer sr-only" />
            <label htmlFor={inputId} className={`${segmentedControlClass} min-w-0 text-center peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-flush-pink peer-disabled:cursor-not-allowed peer-disabled:opacity-50 ${selected ? segmentedControlSelectedClass : segmentedControlUnselectedClass}`}>{option.label}</label>
          </div>;
        })}
      </div>
      {error ? <p id={errorId} className="text-xs font-medium text-red-600">{error}</p> : null}
    </fieldset>
  );
}

function ColorField({ value, error, disabled, onChange }: {
  value: BowelLog["color"] | undefined;
  error?: string;
  disabled: boolean;
  onChange: (value: BowelLog["color"]) => void;
}) {
  const errorId = useId();
  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={error ? errorId : undefined} aria-invalid={Boolean(error)} disabled={disabled}>
      <legend className="text-[15px] font-bold text-charcoal">色 <span aria-hidden="true">*</span></legend>
      <div className="grid grid-cols-2 gap-1.5">
        {BOWEL_COLOR_OPTIONS.map((option) => {
          const inputId = `color-${option.value}`;
          const selected = value === option.value;
          return <div key={option.value}>
            <input id={inputId} name="color" type="radio" value={option.value} checked={selected} onChange={() => onChange(option.value)} className="peer sr-only" />
            <label htmlFor={inputId} className={`relative flex min-h-10 items-center justify-center gap-2 rounded-lg border border-faded-gray px-2 text-xs font-bold shadow-[0_2px_0_var(--color-faded-edge)] transition-[transform,box-shadow,background-color,border-color,color] duration-150 hover:border-flush-pink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-flush-pink peer-disabled:cursor-not-allowed peer-disabled:opacity-50 active:translate-y-px active:shadow-none ${selected ? segmentedControlSelectedClass : segmentedControlUnselectedClass}`}>
              <span aria-hidden="true" className={`size-3 shrink-0 rounded-full ring-1 ring-charcoal/20 ${colorSwatchClass[option.value]}`} />
              {option.label}
              {selected ? <Check aria-hidden="true" className="absolute right-2 size-3.5" strokeWidth={3} /> : null}
            </label>
          </div>;
        })}
      </div>
      {error ? <p id={errorId} className="text-xs font-medium text-red-600">{error}</p> : null}
    </fieldset>
  );
}

function getFieldErrors(draft: BowelLogDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (!BOWEL_HARDNESS_OPTIONS.some((option) => option.value === draft.hardness)) errors.hardness = REQUIRED_FIELD_MESSAGES.hardness;
  if (!BOWEL_AMOUNT_OPTIONS.some((option) => option.value === draft.amount)) errors.amount = REQUIRED_FIELD_MESSAGES.amount;
  if (!BOWEL_COLOR_OPTIONS.some((option) => option.value === draft.color)) errors.color = REQUIRED_FIELD_MESSAGES.color;
  if (!BOWEL_EASE_OPTIONS.some((option) => option.value === draft.ease)) errors.ease = REQUIRED_FIELD_MESSAGES.ease;
  return errors;
}

export function BowelLogForm({ onSubmit }: BowelLogFormProps) {
  const draft = useBattleStore((state) => state.bowelDraft) ?? {};
  const setBowelDraft = useBattleStore((state) => state.setBowelDraft);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const answeredCount = (Object.keys(REQUIRED_FIELD_MESSAGES) as FieldName[]).filter((field) => draft[field] !== undefined).length;
  const remainingCount = 4 - answeredCount;

  const updateDraft = <T extends FieldName>(field: T, value: BowelLog[T]) => {
    setBowelDraft({ ...draft, [field]: value });
    setErrors((current) => ({ ...current, [field]: undefined, submit: undefined }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fieldErrors = getFieldErrors(draft);
    if (!isBowelLog(draft)) {
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    try {
      await onSubmit(draft);
    } catch {
      setErrors({ submit: "記録を続けられませんでした。もう一度お試しください。" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex w-full max-w-md flex-col gap-4">
      <header className="flex items-start justify-between gap-4 rounded-xl bg-paper-white/70 px-3.5 py-3">
        <div className="min-w-0">
          <p className="text-[15px] font-black tracking-[-0.02em] text-charcoal">Battle Clear</p>
          <p className="mt-0.5 text-xs font-medium text-pencil-gray">最後に今日の状態を4タップで残そう</p>
        </div>
        <div className="shrink-0 text-right" aria-label={`4項目中${answeredCount}項目を選択済み`}>
          <p className="text-sm font-black tabular-nums text-flush-edge">{answeredCount} / 4</p>
          <div className="mt-1 flex justify-end gap-1" aria-hidden="true">
            {(Object.keys(REQUIRED_FIELD_MESSAGES) as FieldName[]).map((field) => <span key={field} className={`size-1.5 rounded-full ${draft[field] !== undefined ? "bg-flush-pink" : "bg-cotton-pink"}`} />)}
          </div>
        </div>
      </header>

      <HardnessField value={draft.hardness} error={errors.hardness} disabled={isSubmitting} onChange={(value) => updateDraft("hardness", value)} />
      <div className="grid grid-cols-2 gap-3">
        <SegmentedField label="量" name="amount" options={BOWEL_AMOUNT_OPTIONS} value={draft.amount} error={errors.amount} disabled={isSubmitting} onChange={(value) => updateDraft("amount", value)} />
        <SegmentedField label="出やすさ" name="ease" options={BOWEL_EASE_OPTIONS} value={draft.ease} error={errors.ease} disabled={isSubmitting} onChange={(value) => updateDraft("ease", value)} />
      </div>
      <ColorField value={draft.color} error={errors.color} disabled={isSubmitting} onChange={(value) => updateDraft("color", value)} />

      {errors.submit ? <p role="alert" className="text-sm text-red-600">{errors.submit}</p> : null}
      <div className="pt-1">
        <button type="submit" disabled={isSubmitting} className="flex min-h-12 w-full items-center justify-center rounded-xl bg-flush-pink px-5 text-[15px] font-black text-paper-white shadow-raised-pink transition-[transform,box-shadow,background-color] duration-150 hover:bg-flush-edge focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flush-pink active:translate-y-1 active:shadow-pressed-pink disabled:opacity-50 disabled:active:translate-y-0 disabled:active:shadow-raised-pink">
          {isSubmitting ? "記録を準備しています…" : remainingCount === 0 ? "記録して次へ" : `あと${remainingCount}つ選んでね`}
        </button>
      </div>
    </form>
  );
}
