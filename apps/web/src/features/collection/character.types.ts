import type { Database } from "@/types/database.types";

type CharacterRow = Database["public"]["Tables"]["characters"]["Row"];

export type CollectionCharacter = Pick<
  CharacterRow,
  "id" | "name" | "attribute" | "rarity"
> & {
  ownershipId: string;
  acquiredAt: string;
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
