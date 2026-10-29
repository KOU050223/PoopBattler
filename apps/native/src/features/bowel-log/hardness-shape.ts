import { getBowelHardnessGroup, type BowelHardnessGroup } from "@poopbattler/domain/records/bowel-log.types";

export type BowelShape = "hard" | "normal" | "soft";

// レポートの集計区分（hard / well_formed / soft）と境界を揃え、きろくとレポートで形の見え方がずれないようにする。
const SHAPE_BY_GROUP: Record<BowelHardnessGroup, BowelShape> = {
  hard: "hard",
  well_formed: "normal",
  soft: "soft",
};

export function toBowelShape(hardness: number): BowelShape {
  return SHAPE_BY_GROUP[getBowelHardnessGroup(hardness)];
}
