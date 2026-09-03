export const HEAD_IDS = [
  "silk-hat",
  "fruit",
  "chef",
  "ahoge",
  "sprout",
  "wave",
] as const;
export type HeadId = (typeof HEAD_IDS)[number];

export const EYE_IDS = ["kiriri", "nikkori", "lashes"] as const;
export type EyeId = (typeof EYE_IDS)[number];

export const MOUTH_IDS = ["tongue", "he", "teeth"] as const;
export type MouthId = (typeof MOUTH_IDS)[number];

export const BODY_COLOR_IDS = [
  "normal",
  "gold",
  "curry",
  "vegetable",
  "spicy",
  "meat",
  "banana",
  "yogurt",
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
