"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";

import type { CompleteBattleResult } from "@/features/battle/actions";
import { BattleCompletionResult } from "@/features/battle/components/battle-completion-result";
import { PoopmFigure3D } from "@/features/poopm-3d/components/poopm-figure-3d";
import type { Poopm3DStageProps } from "@/features/poopm-3d/components/poopm-3d-stage";
import {
  POOPM_3D_BATTLE_MOTIONS,
  type Poopm3DBattleMotion,
} from "@/features/poopm-3d/poopm-3d.motion";
import type { Poopm3DAppearance } from "@/features/poopm-3d/components/poopm-3d-model";
import { POOPM_APPEARANCES } from "@/features/poopm/poopm.appearances";
import {
  BODY_COLOR_IDS,
  EYE_IDS,
  HEAD_IDS,
  MOUTH_IDS,
} from "@/features/poopm/poopm.types";

const Poopm3DStage = dynamic(
  () =>
    import("@/features/poopm-3d/components/poopm-3d-stage").then(
      (module) => module.Poopm3DStage,
    ),
  { ssr: false, loading: () => null },
);

const Poopm3DGacha = dynamic(
  () =>
    import("@/features/poopm-3d/components/poopm-3d-gacha").then(
      (module) => module.Poopm3DGacha,
    ),
  { ssr: false, loading: () => null },
);

const DEMO_RESULT: Extract<CompleteBattleResult, { success: true }> = {
  success: true,
  battleId: "00000000-0000-4000-8000-000000000001",
  companionshipResult: true,
  acquiredCharacter: {
    id: "curry-poop",
    name: "カレーうんちくん",
    attribute: "curry",
    rarity: "common",
  },
  completedAt: "2026-10-03T04:00:00.000Z",
  usedMealLog: true,
  isFirstCompletedBattle: false,
};

const SIDES = ["player", "enemy"] as const;
type Side = (typeof SIDES)[number];

const SIDE_LABEL: Record<Side, string> = { player: "味方", enemy: "敵" };

const chipClass = (active: boolean) =>
  `rounded-lg border-2 px-2.5 py-1 text-xs font-medium ${
    active
      ? "border-night-ink bg-night-ink text-paper-white"
      : "border-faded-gray bg-paper-white text-pencil-gray"
  }`;

function OptionRow<T extends string>({
  label,
  options,
  value,
  onSelect,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onSelect: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-pencil-gray">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={chipClass(option === value)}
            onClick={() => onSelect(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Poopm3DPreview() {
  const [appearances, setAppearances] = useState<Record<Side, Poopm3DAppearance>>({
    player: { color: "a", eyes: "eye-a", mouth: "mouth-a", head: "none" },
    enemy: { color: "orange", eyes: "eye-g", mouth: "mouth-g", head: "hat-c" },
  });
  const [motions, setMotions] = useState<
    Record<Side, Poopm3DStageProps["player"]["motion"]>
  >({
    player: { name: "idle", nonce: 0 },
    enemy: { name: "idle", nonce: 0 },
  });
  const [speed, setSpeed] = useState<1 | 2>(1);
  const [gachaNonce, setGachaNonce] = useState(0);

  const playMotion = useCallback((side: Side, name: Poopm3DBattleMotion) => {
    setMotions((prev) => ({
      ...prev,
      [side]: { name, nonce: prev[side].nonce + 1 },
    }));
  }, []);

  const onMotionFinished = useCallback(
    (side: Side, name: Poopm3DBattleMotion) => {
      // once 再生のあと idle に戻す。ko / lose / win は終端ポーズを保持する。
      if (name === "ko" || name === "lose" || name === "win") return;
      setMotions((prev) => {
        if (prev[side].name !== name) return prev;
        return { ...prev, [side]: { name: "idle", nonce: prev[side].nonce + 1 } };
      });
    },
    [],
  );

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 p-4">
      <div className="relative h-80 overflow-hidden rounded-2xl border-2 border-faded-gray bg-paper-white shadow-raised-gray">
        <div className="absolute inset-0">
          <Poopm3DStage
            player={{
              appearance: appearances.player,
              motion: motions.player,
            }}
            enemy={{
              appearance: appearances.enemy,
              motion: motions.enemy,
            }}
            speed={speed}
            onMotionFinished={onMotionFinished}
          />
        </div>
      </div>

      <button
        type="button"
        className={chipClass(speed === 2)}
        onClick={() => setSpeed((prev) => (prev === 1 ? 2 : 1))}
      >
        再生速度 ×{speed}
      </button>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-charcoal">ガチャ演出（reveal）</h2>
        <div className="relative h-72 overflow-hidden rounded-2xl border-2 border-faded-gray bg-night-ink shadow-raised-gray">
          {/* カメラ映像の代わりの仮背景。本番ではこの下に video が敷かれる。 */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_78%,var(--color-blush-wash)_0%,transparent_42%),linear-gradient(180deg,#1a1d3a_0%,var(--color-night-ink)_100%)]"
          />
          <div className="absolute inset-x-0 bottom-[-1rem] flex justify-center">
            <div className="relative h-56 w-56">
              <Poopm3DGacha key={gachaNonce} appearance={appearances.enemy} />
            </div>
          </div>
        </div>
        <button
          type="button"
          className={chipClass(false)}
          onClick={() => setGachaNonce((prev) => prev + 1)}
        >
          這い出しを再生（敵の外見を使用）
        </button>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-charcoal">仲間になった結果画面</h2>
        <BattleCompletionResult result={DEMO_RESULT} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-charcoal">
          図鑑（カードごとのCanvas・画面外は未マウント）
        </h2>
        <ul className="grid grid-cols-4 gap-2">
          {Object.entries(POOPM_APPEARANCES).map(([id, appearance]) => (
            <li
              key={id}
              className="flex flex-col items-center gap-1 rounded-2xl border-2 border-faded-gray bg-paper-white p-2 shadow-raised-gray"
            >
              <PoopmFigure3D
                appearance={appearance}
                motion="idle"
                label={id}
                className="h-16 w-16"
              />
              <p className="text-[11px] font-medium text-pencil-gray">{id}</p>
            </li>
          ))}
        </ul>
      </section>

      {SIDES.map((side) => (
        <section key={side} className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-charcoal">{SIDE_LABEL[side]}</h2>
          <OptionRow
            label="モーション"
            options={POOPM_3D_BATTLE_MOTIONS}
            value={motions[side].name}
            onSelect={(motion) => playMotion(side, motion)}
          />
          <OptionRow
            label="頭"
            options={HEAD_IDS}
            value={appearances[side].head}
            onSelect={(head) =>
              setAppearances((prev) => ({
                ...prev,
                [side]: { ...prev[side], head },
              }))
            }
          />
          <OptionRow
            label="体色"
            options={BODY_COLOR_IDS}
            value={appearances[side].color}
            onSelect={(color) =>
              setAppearances((prev) => ({
                ...prev,
                [side]: { ...prev[side], color },
              }))
            }
          />
          <OptionRow
            label="目"
            options={EYE_IDS}
            value={appearances[side].eyes}
            onSelect={(eyes) =>
              setAppearances((prev) => ({
                ...prev,
                [side]: { ...prev[side], eyes },
              }))
            }
          />
          <OptionRow
            label="口"
            options={MOUTH_IDS}
            value={appearances[side].mouth}
            onSelect={(mouth) =>
              setAppearances((prev) => ({
                ...prev,
                [side]: { ...prev[side], mouth },
              }))
            }
          />
        </section>
      ))}
    </div>
  );
}
