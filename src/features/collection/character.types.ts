import type { Database } from "@/types/database.types";

import type { BaseStats } from "./character-growth";

type CharacterRow = Database["public"]["Tables"]["characters"]["Row"];

export type CollectionCharacter = Pick<
  CharacterRow,
  "id" | "name" | "attribute" | "rarity"
> & {
  ownershipId: string;
  acquiredAt: string;
  /** ★の段階。0=★1、2=★3。 */
  tier: number;
  /** 現在の★での凸数（0〜4）。 */
  rank: number;
  /** 仲間化時に振られた個体値。合成・進化でも変わらない。 */
  baseStats: BaseStats;
  /** 個体値に★と凸を掛けた実効値。バトルで使われる値と一致する。 */
  hp: number;
  power: number;
  speed: number;
};

export const COLLECTION_RARITY_LABELS: Record<
  CharacterRow["rarity"],
  string
> = {
  common: "コモン",
  rare: "レア",
  epic: "エピック",
  legendary: "レジェンダリー",
};
