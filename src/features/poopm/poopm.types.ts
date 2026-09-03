export const HEAD_IDS = ["hat-a", "hat-b", "hat-c", "hat-d", "hat-e", "hat-f"] as const;
export type HeadId = (typeof HEAD_IDS)[number];

export const EYE_IDS = [
  "eye-a",
  "eye-b",
  "eye-c",
  "eye-d",
  "eye-e",
  "eye-f",
  "eye-g",
  "eye-h",
  "eye-i",
  "eye-j",
] as const;
export type EyeId = (typeof EYE_IDS)[number];

export const MOUTH_IDS = [
  "mouth-a",
  "mouth-b",
  "mouth-c",
  "mouth-d",
  "mouth-e",
  "mouth-f",
  "mouth-g",
  "mouth-h",
  "mouth-i",
  "mouth-j",
  "mouth-k",
] as const;
export type MouthId = (typeof MOUTH_IDS)[number];

export const BODY_COLOR_IDS = [
  "a",
  "blue",
  "charcoal",
  "cyan",
  "gold",
  "green",
  "mint",
  "orange",
  "pink",
  "purple",
  "red",
  "white",
  "yellow",
] as const;
export type BodyColorId = (typeof BODY_COLOR_IDS)[number];

export type PoopmAppearance = {
  head: HeadId;
  eyes: EyeId;
  mouth: MouthId;
  color: BodyColorId;
};

export type PoopmFacing = "front" | "back";
export type PoopmMotion = "idle" | "hit" | "eat";

export type PoopmFigureProps = {
  appearance: PoopmAppearance;
  facing: PoopmFacing;
  motion: PoopmMotion;
};
