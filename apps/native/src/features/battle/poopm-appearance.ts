// apps/web/src/features/poopm/poopm.{types,appearances}.ts と同じ対応表（web は @/ 依存のため参照できずここに持つ）。
export type BodyColorId =
  | "a" | "blue" | "charcoal" | "cyan" | "gold" | "green" | "mint"
  | "orange" | "pink" | "purple" | "red" | "white" | "yellow";
export type HeadId = "none" | "hat-a" | "hat-b" | "hat-c" | "hat-d" | "hat-e" | "hat-f";
export type EyeId =
  | "eye-a" | "eye-b" | "eye-c" | "eye-d" | "eye-e"
  | "eye-f" | "eye-g" | "eye-h" | "eye-i" | "eye-j";
export type MouthId =
  | "mouth-a" | "mouth-b" | "mouth-c" | "mouth-d" | "mouth-e" | "mouth-f"
  | "mouth-g" | "mouth-h" | "mouth-i" | "mouth-j" | "mouth-k";

export type PoopmAppearance = { head: HeadId; eyes: EyeId; mouth: MouthId; color: BodyColorId };

export const DEFAULT_APPEARANCE: PoopmAppearance = {
  head: "none",
  eyes: "eye-a",
  mouth: "mouth-a",
  color: "a",
};

export const POOPM_APPEARANCES: Record<string, PoopmAppearance> = {
  "curry-poop": { head: "hat-c", eyes: "eye-g", mouth: "mouth-g", color: "orange" },
  "vegetable-poop": { head: "hat-a", eyes: "eye-c", mouth: "mouth-b", color: "green" },
  "spicy-poop": { head: "hat-d", eyes: "eye-i", mouth: "mouth-k", color: "red" },
  "meat-poop": { head: "hat-e", eyes: "eye-d", mouth: "mouth-f", color: "charcoal" },
  "banana-poop": { head: "hat-f", eyes: "eye-b", mouth: "mouth-c", color: "yellow" },
  "yogurt-poop": { head: "hat-e", eyes: "eye-h", mouth: "mouth-e", color: "white" },
  "normal-poop": DEFAULT_APPEARANCE,
  "golden-poop": { head: "hat-b", eyes: "eye-j", mouth: "mouth-d", color: "gold" },
};

export function appearanceForCharacter(characterId: string): PoopmAppearance {
  return POOPM_APPEARANCES[characterId] ?? DEFAULT_APPEARANCE;
}
