import type { SupabaseClient } from "@supabase/supabase-js";
import { effectiveStats } from "@poopbattler/domain/records/character-growth";
import type { CollectionCharacter } from "@poopbattler/domain/records/character.types";

type OwnershipRow = {
  id: string;
  acquired_at: string;
  hp: number;
  power: number;
  speed: number;
  tier: number;
  rank: number;
  characters: Pick<CollectionCharacter, "id" | "name" | "attribute" | "rarity"> | null;
};

/** apps/web/src/features/collection/actions.ts と同じ。本人の所持キャラを新しい取得順で返す。 */
export function createCollectionGateway(supabase: SupabaseClient) {
  return {
    async getCollectionCharacters(): Promise<CollectionCharacter[]> {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return [];

      const { data, error } = await supabase
        .from("user_characters")
        .select("id, acquired_at, hp, power, speed, tier, rank, characters!user_characters_character_id_fkey(id, name, attribute, rarity)")
        .eq("user_id", user.id)
        .order("acquired_at", { ascending: false });
      if (error || !data) throw new Error("取得キャラクターの読み込みに失敗しました。");

      return (data as unknown as OwnershipRow[]).flatMap((ownership) => {
        const character = ownership.characters;
        if (!character) return [];
        // hp/power/speed は個体値（加入時に確定）。★と凸を掛けた実効値がバトルで使われる。
        const baseStats = { hp: ownership.hp, power: ownership.power, speed: ownership.speed };
        const growth = { tier: ownership.tier, rank: ownership.rank };
        return [{
          ownershipId: ownership.id,
          acquiredAt: ownership.acquired_at,
          tier: ownership.tier,
          rank: ownership.rank,
          baseStats,
          ...effectiveStats(baseStats, character.rarity, growth),
          id: character.id,
          name: character.name,
          attribute: character.attribute,
          rarity: character.rarity,
        }];
      });
    },
  };
}
