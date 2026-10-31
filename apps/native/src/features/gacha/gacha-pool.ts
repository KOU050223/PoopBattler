import type { HeadId } from "../battle/poopm-appearance";

export type GachaItem = { kind: "head"; head: Exclude<HeadId, "none"> } | { kind: "poopm"; characterId: string };

// 手・足パーツは絵ができてから足す（docs/parts.md の部位は頭・手・足）。
export const GACHA_HEADS = ["hat-a", "hat-b", "hat-c", "hat-d", "hat-e", "hat-f"] as const;

// 新しい仲間は「月1体くらいの特別なこと」なので、確率は低く固定する。
export const POOPM_CHANCE = 0.05;

// 表示名は supabase の seed（characters）と同じ。ここだけ端末内で完結させるため写している。
export const GACHA_POOPMS = [
  "curry-poop",
  "vegetable-poop",
  "spicy-poop",
  "meat-poop",
  "banana-poop",
  "yogurt-poop",
  "normal-poop",
  "golden-poop",
] as const;
