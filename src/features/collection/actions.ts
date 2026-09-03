"use server";

import { createClient } from "@/lib/supabase/server";

import type { CollectionCharacter } from "./character.types";

/** 本人が取得したキャラクターだけを、新しい取得日時順で返す。 */
export async function getCollectionCharactersAction(): Promise<CollectionCharacter[]> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return [];

  const { data, error } = await supabase
    .from("user_characters")
    .select("id, acquired_at, characters!user_characters_character_id_fkey(id, name, attribute, rarity)")
    .eq("user_id", user.id)
    .order("acquired_at", { ascending: false });

  if (error) {
    throw new Error("取得キャラクターの読み込みに失敗しました。");
  }

  return data.flatMap((ownership) => {
    const character = ownership.characters;
    if (!character) return [];

    return [{
      ownershipId: ownership.id,
      acquiredAt: ownership.acquired_at,
      id: character.id,
      name: character.name,
      attribute: character.attribute,
      rarity: character.rarity,
    }];
  });
}
