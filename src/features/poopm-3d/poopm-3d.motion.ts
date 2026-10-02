import type { Poopm3DClip } from "@/features/poopm-3d/poopm-3d.assets";

// バトル画面で使うモーション名。GLB のクリップ名と対応させる。
// heal は戦闘では使わない（Issue #199）ためここには置かない。
export const POOPM_3D_BATTLE_MOTIONS = [
  "idle",
  "attack",
  "hit",
  "special_charge",
  "special_fire",
  "swap_in",
  "swap_out",
  "ko",
  "lose",
  "win",
] as const;
export type Poopm3DBattleMotion = (typeof POOPM_3D_BATTLE_MOTIONS)[number];

export type Poopm3DMotionSpec = {
  clip: Poopm3DClip;
  loop: "repeat" | "once";
  // クロスフェード時間。被弾・攻撃は立ち上がりを速く、姿勢変化は緩やかに。
  fadeMs: number;
};

export const POOPM_3D_MOTION: Record<Poopm3DBattleMotion, Poopm3DMotionSpec> = {
  idle: { clip: "idle", loop: "repeat", fadeMs: 250 },
  attack: { clip: "attack", loop: "once", fadeMs: 100 },
  hit: { clip: "hit", loop: "once", fadeMs: 100 },
  special_charge: { clip: "special_charge", loop: "repeat", fadeMs: 250 },
  special_fire: { clip: "special_fire", loop: "once", fadeMs: 100 },
  swap_in: { clip: "swap_in", loop: "once", fadeMs: 100 },
  swap_out: { clip: "swap_out", loop: "once", fadeMs: 100 },
  ko: { clip: "ko", loop: "once", fadeMs: 150 },
  lose: { clip: "lose", loop: "once", fadeMs: 250 },
  win: { clip: "win", loop: "once", fadeMs: 250 },
};

export function poopm3DMotionSpec(
  motion: Poopm3DBattleMotion,
): Poopm3DMotionSpec {
  return POOPM_3D_MOTION[motion];
}
