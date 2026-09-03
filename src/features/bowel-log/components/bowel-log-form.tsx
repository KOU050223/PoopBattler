"use client";

import { useId, useState } from "react";

import {
  BOWEL_AMOUNT_OPTIONS,
  BOWEL_COLOR_OPTIONS,
  BOWEL_EASE_OPTIONS,
  BOWEL_HARDNESS_OPTIONS,
  isBowelLog,
  type BowelLog,
  type BowelLogDraft,
} from "../bowel-log.types";
import { useBattleStore } from "@/stores/battle-store";
import { primaryButtonClass, stancePillClass } from "@/lib/ui-classes";

type BowelLogFormProps = {
  /** 検証済みの4項目を、戦闘後の食事写真選択へ渡す。 */
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

type ChoiceFieldProps<T extends string | number> = {
  label: string;
  name: FieldName;
  options: readonly { value: T; label: string }[];
  value: T | undefined;
  error?: string;
  disabled: boolean;
  onChange: (value: T) => void;
};

function ChoiceField<T extends string | number>({
  label,
  name,
  options,
  value,
  error,
  disabled,
  onChange,
}: ChoiceFieldProps<T>) {
  const errorId = useId();

  return (
    <fieldset
      className="flex flex-col gap-3"
      aria-describedby={error ? errorId : undefined}
      aria-invalid={Boolean(error)}
      disabled={disabled}
    >
      <legend className="font-bold text-charcoal">{label} <span aria-hidden="true">*</span></legend>
      <div className="grid grid-cols-3 gap-3">
        {options.map((option) => {
          const inputId = `${name}-${option.value}`;
          const selected = value === option.value;
          return (
            <div key={option.value}>
              <input
                id={inputId}
                name={name}
                type="radio"
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="peer sr-only"
              />
              <label
                htmlFor={inputId}
                className={`flex items-center justify-center text-center peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-flush-pink peer-disabled:cursor-not-allowed peer-disabled:opacity-50 ${stancePillClass(selected, disabled)}`}
              >
                {option.label}
              </label>
            </div>
          );
        })}
      </div>
      {error && <p id={errorId} className="text-sm text-red-600">{error}</p>}
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
    <form onSubmit={submit} noValidate className="flex max-w-md flex-col gap-6">
      <ChoiceField
        label="硬さ"
        name="hardness"
        options={BOWEL_HARDNESS_OPTIONS}
        value={draft.hardness}
        error={errors.hardness}
        disabled={isSubmitting}
        onChange={(value) => updateDraft("hardness", value)}
      />
      <ChoiceField
        label="量"
        name="amount"
        options={BOWEL_AMOUNT_OPTIONS}
        value={draft.amount}
        error={errors.amount}
        disabled={isSubmitting}
        onChange={(value) => updateDraft("amount", value)}
      />
      <ChoiceField
        label="色"
        name="color"
        options={BOWEL_COLOR_OPTIONS}
        value={draft.color}
        error={errors.color}
        disabled={isSubmitting}
        onChange={(value) => updateDraft("color", value)}
      />
      <ChoiceField
        label="出やすさ"
        name="ease"
        options={BOWEL_EASE_OPTIONS}
        value={draft.ease}
        error={errors.ease}
        disabled={isSubmitting}
        onChange={(value) => updateDraft("ease", value)}
      />

      {errors.submit && <p role="alert" className="text-sm text-red-600">{errors.submit}</p>}
      <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
        {isSubmitting ? "記録を準備しています…" : "次へ"}
      </button>
    </form>
  );
}
