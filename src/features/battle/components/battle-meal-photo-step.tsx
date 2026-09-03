"use client";

import Image from "next/image";

import { captionTextClass, mutedTextClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui-classes";

type BattleMealPhotoStepProps = {
  previewUrl: string | null;
  submitting: boolean;
  onOpenPicker: () => void;
  onSkip: () => void;
  onSend: () => void;
};

/** 排便の次。カメラは開かず、カメラロールのファイル選択だけを使う。 */
export function BattleMealPhotoStep({
  previewUrl,
  submitting,
  onOpenPicker,
  onSkip,
  onSend,
}: BattleMealPhotoStepProps) {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1 text-center">
        <p className="text-xl font-bold">食事の写真</p>
        <p className={`text-sm ${mutedTextClass}`}>
          任意です。選ぶと仲間化抽選に使います。選ばなくてもバトルは完了できます。
        </p>
      </div>

      {previewUrl ? (
        <Image
          src={previewUrl}
          alt="選択した食事のプレビュー"
          width={720}
          height={405}
          unoptimized
          className="aspect-video w-full rounded-2xl border-2 border-faded-gray object-cover shadow-raised-gray"
        />
      ) : (
        <p className={`text-center text-sm ${mutedTextClass}`}>
          写真を選ぶか、スキップして完了できます。
        </p>
      )}

      <p className={`text-center ${captionTextClass}`}>JPEG・PNG・WebP、5MB以下</p>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={submitting}
          onClick={onOpenPicker}
        >
          {previewUrl ? "写真を選び直す" : "写真を選ぶ"}
        </button>
        {previewUrl ? (
          <button
            type="button"
            className={primaryButtonClass}
            disabled={submitting}
            onClick={onSend}
          >
            {submitting ? "送信しています…" : "この写真で送る"}
          </button>
        ) : null}
        <button
          type="button"
          className={previewUrl ? secondaryButtonClass : primaryButtonClass}
          disabled={submitting}
          onClick={onSkip}
        >
          {submitting ? "送信しています…" : "写真なしで完了する"}
        </button>
      </div>
    </section>
  );
}
