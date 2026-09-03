import type { PoopmAppearance } from "@/features/poopm/poopm.types";

export const DEFAULT_APPEARANCE: PoopmAppearance = {
  head: "hat-a",
  eyes: "eye-a",
  mouth: "mouth-a",
  color: "a",
};

export const POOPM_APPEARANCES: Record<string, PoopmAppearance> = {
  "curry-poop": {
    head: "hat-c",
    eyes: "eye-g",
    mouth: "mouth-g",
    color: "orange",
  },
  "vegetable-poop": {
    head: "hat-a",
    eyes: "eye-c",
    mouth: "mouth-b",
    color: "green",
  },
  "spicy-poop": {
    head: "hat-d",
    eyes: "eye-i",
    mouth: "mouth-k",
    color: "red",
  },
  "meat-poop": {
    head: "hat-e",
    eyes: "eye-d",
    mouth: "mouth-f",
    color: "charcoal",
  },
  "banana-poop": {
    head: "hat-f",
    eyes: "eye-b",
    mouth: "mouth-c",
    color: "yellow",
  },
  "yogurt-poop": {
    head: "hat-e",
    eyes: "eye-h",
    mouth: "mouth-e",
    color: "white",
  },
  "normal-poop": DEFAULT_APPEARANCE,
  "golden-poop": {
    head: "hat-b",
    eyes: "eye-j",
    mouth: "mouth-d",
    color: "gold",
  },
};

export function appearanceForCharacter(characterId: string): PoopmAppearance {
  return POOPM_APPEARANCES[characterId] ?? DEFAULT_APPEARANCE;
}
