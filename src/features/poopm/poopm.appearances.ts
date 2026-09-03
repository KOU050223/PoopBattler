import type { PoopmAppearance } from "@/features/poopm/poopm.types";

export const DEFAULT_APPEARANCE: PoopmAppearance = {
  head: "ahoge",
  eyes: "nikkori",
  mouth: "tongue",
  color: "normal",
};

export const POOPM_APPEARANCES: Record<string, PoopmAppearance> = {
  "curry-poop": {
    head: "chef",
    eyes: "nikkori",
    mouth: "tongue",
    color: "curry",
  },
  "vegetable-poop": {
    head: "sprout",
    eyes: "lashes",
    mouth: "he",
    color: "vegetable",
  },
  "spicy-poop": {
    head: "wave",
    eyes: "kiriri",
    mouth: "he",
    color: "spicy",
  },
  "meat-poop": {
    head: "wave",
    eyes: "kiriri",
    mouth: "teeth",
    color: "meat",
  },
  "banana-poop": {
    head: "fruit",
    eyes: "nikkori",
    mouth: "tongue",
    color: "banana",
  },
  "yogurt-poop": {
    head: "silk-hat",
    eyes: "lashes",
    mouth: "he",
    color: "yogurt",
  },
  "normal-poop": DEFAULT_APPEARANCE,
  "golden-poop": {
    head: "silk-hat",
    eyes: "lashes",
    mouth: "teeth",
    color: "gold",
  },
};

export function appearanceForCharacter(characterId: string): PoopmAppearance {
  return POOPM_APPEARANCES[characterId] ?? DEFAULT_APPEARANCE;
}
