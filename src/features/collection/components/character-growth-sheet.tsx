"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

import { PoopmFigure3D } from "@/features/poopm-3d/components/poopm-figure-3d";
import { appearanceForCharacter } from "@/features/poopm/poopm.appearances";
import {
  captionTextClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/lib/ui-classes";

import { evolveCharacterAction, mergeCharactersAction } from "../actions";
import {
  canEvolve,
  checkMerge,
  effectiveStats,
  isFullyGrown,
  MAX_RANK,
  MERGE_RANK_GAIN,
  type BaseStats,
  type MergeWarning,
} from "../character-growth";
import type { CollectionCharacter } from "../character.types";
import { GrowthBadge, growthLabel } from "./growth-badge";

type CharacterGrowthSheetProps = {
  /** 育成するベース。null で閉じる。 */
  character: CollectionCharacter | null;
  characters: readonly CollectionCharacter[];
  starterIds: ReadonlySet<string>;
  onClose: () => void;
};

const STAT_ROWS: Array<{ key: keyof BaseStats; label: string }> = [
  { key: "hp", label: "HP" },
  { key: "power", label: "攻撃" },
  { key: "speed", label: "速さ" },
];

/** 合成と進化をまとめた育成シート。スマホでは下から、広い画面では中央に出す。 */
export function CharacterGrowthSheet({
  character,
  characters,
  starterIds,
  onClose,
}: CharacterGrowthSheetProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const isOpen = character != null;

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement;
      dialogRef.current?.focus();
      return;
    }

    previouslyFocusedElementRef.current?.focus();
  }, [isOpen]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {character && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="growth-sheet-title"
            ref={dialogRef}
            tabIndex={-1}
            onKeyDown={(event) => trapFocus(event, dialogRef.current, onClose)}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 400, damping: 34 }}
            className="flex max-h-[88dvh] w-full max-w-md flex-col overflow-y-auto rounded-t-2xl border-2 border-faded-gray bg-paper-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-raised-gray outline-none sm:rounded-2xl"
          >
            {/* key で個体ごとに中身を作り直し、別の個体を開いたときに選択状態を持ち越さない */}
            <GrowthSheetBody
              key={character.ownershipId}
              character={character}
              characters={characters}
              starterIds={starterIds}
              onClose={onClose}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function GrowthSheetBody({
  character,
  characters,
  starterIds,
  onClose,
}: {
  character: CollectionCharacter;
  characters: readonly CollectionCharacter[];
  starterIds: ReadonlySet<string>;
  onClose: () => void;
}) {
  const [materialId, setMaterialId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const material = materialId == null
    ? null
    : characters.find((candidate) => candidate.ownershipId === materialId) ?? null;
  const candidates = characters.filter(
    (candidate) => candidate.id === character.id && candidate.ownershipId !== character.ownershipId,
  );

  function evolve() {
    setError(null);
    startTransition(async () => {
      const result = await evolveCharacterAction(character.ownershipId);
      if (!result.ok) setError(result.message);
    });
  }

  function merge(confirmEnhanced: boolean) {
    if (material == null) return;
    setError(null);
    startTransition(async () => {
      const result = await mergeCharactersAction(
        character.ownershipId,
        material.ownershipId,
        confirmEnhanced,
      );
      if (result.ok) {
        setMaterialId(null);
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <PoopmFigure3D
          appearance={appearanceForCharacter(character.id)}
          motion="idle"
          label={character.name}
          className="h-16 w-16 shrink-0"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 id="growth-sheet-title" className="truncate font-bold text-charcoal">
            {character.name}
          </h2>
          <GrowthBadge tier={character.tier} rank={character.rank} />
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl text-pencil-gray hover:bg-blush-wash disabled:opacity-50"
          aria-label="閉じる"
        >
          ×
        </button>
      </div>

      <StatsTable character={character} />

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {material ? (
        <MergeConfirm
          base={character}
          material={material}
          materialInParty={starterIds.has(material.ownershipId)}
          isPending={isPending}
          onCancel={() => {
            setMaterialId(null);
            setError(null);
          }}
          onConfirm={merge}
        />
      ) : isFullyGrown(character) ? (
        <p className="rounded-xl bg-blush-wash px-3 py-3 text-center text-sm font-bold text-flush-edge">
          最大まで育ちました
        </p>
      ) : canEvolve(character) ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-charcoal">
            4凸に達しました。進化すると★{character.tier + 2}になり、また凸を重ねられます。
            強さは今のまま引き継がれます。
          </p>
          <button
            type="button"
            onClick={evolve}
            disabled={isPending}
            className={primaryButtonClass}
          >
            {isPending ? "進化中…" : `★${character.tier + 2}に進化する`}
          </button>
        </div>
      ) : (
        <MaterialList
          base={character}
          candidates={candidates}
          starterIds={starterIds}
          disabled={isPending}
          onPick={(id) => {
            setMaterialId(id);
            setError(null);
          }}
        />
      )}
    </div>
  );
}

function StatsTable({ character }: { character: CollectionCharacter }) {
  return (
    <dl className="grid grid-cols-3 gap-2">
      {STAT_ROWS.map(({ key, label }) => (
        <div key={key} className="rounded-xl bg-blush-wash/60 px-2 py-1.5 text-center">
          <dt className="text-xs font-medium text-pencil-gray">{label}</dt>
          <dd className="text-xl font-black leading-tight tabular-nums text-charcoal">
            {character[key]}
          </dd>
          <dd className="text-[11px] text-faded-edge tabular-nums">個体値 {character.baseStats[key]}</dd>
        </div>
      ))}
    </dl>
  );
}

function MaterialList({
  base,
  candidates,
  starterIds,
  disabled,
  onPick,
}: {
  base: CollectionCharacter;
  candidates: readonly CollectionCharacter[];
  starterIds: ReadonlySet<string>;
  disabled: boolean;
  onPick: (ownershipId: string) => void;
}) {
  const gain = MERGE_RANK_GAIN[base.rarity];

  if (base.rank + gain > MAX_RANK) {
    return (
      <p className={captionTextClass}>
        これ以上は凸を重ねられません。
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-2" aria-labelledby="material-heading">
      <div className="flex flex-col gap-0.5">
        <h3 id="material-heading" className="text-sm font-bold text-charcoal">
          素材を選ぶ
        </h3>
        <p className={captionTextClass}>
          同じ種類の仲間を1体消費して、{gain}凸上げます。
        </p>
      </div>
      {candidates.length === 0 ? (
        <p className="rounded-xl border-2 border-dashed border-faded-gray px-3 py-4 text-center text-sm text-pencil-gray">
          同じ種類の仲間がいません。バトルでもう1体仲間にすると合成できます。
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {candidates.map((candidate) => (
            <li key={candidate.ownershipId}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPick(candidate.ownershipId)}
                className="flex min-h-14 w-full items-center gap-3 rounded-xl border-2 border-faded-gray bg-paper-white px-3 py-2 text-left hover:bg-blush-wash/50 disabled:opacity-50"
              >
                <GrowthBadge tier={candidate.tier} rank={candidate.rank} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate text-xs tabular-nums text-pencil-gray">
                  個体値 HP {candidate.baseStats.hp}・攻撃 {candidate.baseStats.power}・速さ {candidate.baseStats.speed}
                </span>
                {starterIds.has(candidate.ownershipId) && (
                  <span className="shrink-0 rounded-lg bg-blush-wash px-1.5 py-0.5 text-[11px] font-bold text-flush-edge">
                    先発
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function MergeConfirm({
  base,
  material,
  materialInParty,
  isPending,
  onCancel,
  onConfirm,
}: {
  base: CollectionCharacter;
  material: CollectionCharacter;
  materialInParty: boolean;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: (confirmEnhanced: boolean) => void;
}) {
  const check = checkMerge(base, material);
  if (!check.ok) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-charcoal">この組み合わせでは合成できません。</p>
        <button type="button" onClick={onCancel} className={secondaryButtonClass}>
          戻る
        </button>
      </div>
    );
  }

  const after = effectiveStats(base.baseStats, base.rarity, {
    tier: base.tier,
    rank: check.nextRank,
  });
  const enhanced = check.warnings.includes("enhanced-material");

  return (
    <section className="flex flex-col gap-3" aria-labelledby="merge-confirm-heading">
      <h3 id="merge-confirm-heading" className="text-sm font-bold text-charcoal">
        {growthLabel(material.tier, material.rank)}の{material.name}を素材にしますか？
      </h3>

      <dl className="flex flex-col gap-1 rounded-xl bg-blush-wash/60 px-3 py-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-pencil-gray">凸</dt>
          <dd className="font-bold tabular-nums text-charcoal">
            {base.rank} → {check.nextRank}
          </dd>
        </div>
        {STAT_ROWS.map(({ key, label }) => (
          <div key={key} className="flex justify-between gap-3">
            <dt className="text-pencil-gray">{label}</dt>
            <dd className="font-bold tabular-nums text-charcoal">
              {base[key]} → <span className="text-flush-edge">{after[key]}</span>
            </dd>
          </div>
        ))}
      </dl>

      {check.warnings.length > 0 || materialInParty ? (
        <ul className="flex flex-col gap-1.5">
          {check.warnings.map((warning) => (
            <li
              key={warning}
              className={warningClass(warning)}
            >
              {warningMessage(warning, material)}
            </li>
          ))}
          {materialInParty && (
            <li className={noticeWarningClass}>
              この仲間は先発から外れ、空いた枠には別の仲間が入ります。
            </li>
          )}
        </ul>
      ) : null}

      <p className={captionTextClass}>素材にした仲間は元に戻せません。</p>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className={`flex-1 ${secondaryButtonClass}`}
        >
          やめる
        </button>
        <button
          type="button"
          onClick={() => onConfirm(enhanced)}
          disabled={isPending}
          className={`flex-1 ${primaryButtonClass}`}
        >
          {isPending ? "合成中…" : enhanced ? "それでも合成する" : "合成する"}
        </button>
      </div>
    </section>
  );
}

const noticeWarningClass = "rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900";

function warningClass(warning: MergeWarning) {
  // 育成分を失う警告は取り返しがつかないので強く、その他は注意書きの強さに留める。
  return warning === "enhanced-material"
    ? "rounded-xl border-2 border-red-300 bg-red-50 px-3 py-2 text-sm font-bold text-red-700"
    : noticeWarningClass;
}

function warningMessage(warning: MergeWarning, material: CollectionCharacter) {
  switch (warning) {
    case "enhanced-material":
      return `この仲間は${growthLabel(material.tier, material.rank)}まで育っています。素材にすると、育てた分は引き継がれずに消えます。`;
    case "material-has-better-base-stats":
      return "素材の方が個体値が高めです。こちらをベースにした方が強く育つかもしれません。";
  }
}

function trapFocus(
  event: KeyboardEvent<HTMLDivElement>,
  dialog: HTMLDivElement | null,
  onClose: () => void,
) {
  if (event.key === "Escape") {
    onClose();
    return;
  }

  if (event.key !== "Tab") return;

  const focusableElements = dialog?.querySelectorAll<HTMLElement>(
    "button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])",
  );
  if (!focusableElements?.length) return;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}
