"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";

import type { Poopm3DStageProps } from "@/features/poopm-3d/components/poopm-3d-stage";
import {
  POOPM_3D_BATTLE_MOTIONS,
  type Poopm3DBattleMotion,
} from "@/features/poopm-3d/poopm-3d.motion";
import type { Poopm3DAppearance } from "@/features/poopm-3d/components/poopm-3d-model";
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
