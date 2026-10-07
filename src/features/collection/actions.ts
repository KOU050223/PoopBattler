"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

import { effectiveStats } from "./character-growth";
import type { CollectionCharacter } from "./character.types";
import { messageForGrowthError } from "./growth-error";

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
    .select("id, acquired_at, hp, power, speed, tier, rank, characters!user_characters_character_id_fkey(id, name, attribute, rarity)")
    .eq("user_id", user.id)
    .order("acquired_at", { ascending: false });

  if (error) {
    throw new Error("取得キャラクターの読み込みに失敗しました。");
  }

  return data.flatMap((ownership) => {
    const character = ownership.characters;
    if (!character) return [];

    const baseStats = {
      hp: ownership.hp,
      power: ownership.power,
      speed: ownership.speed,
    };
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
}

export type GrowthActionResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * 同じ種族の素材を消費して、ベースの凸を上げる。
 *
 * 育成済みの素材は confirmEnhanced が true でないとサーバーが拒否する。
 * UI が警告を出し、ユーザーが了承したときだけ true を渡す。
 */
export async function mergeCharactersAction(
  baseId: string,
  materialId: string,
  confirmEnhanced: boolean,
): Promise<GrowthActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("merge_characters", {
    p_base_id: baseId,
    p_material_id: materialId,
    p_confirm_enhanced: confirmEnhanced,
  });

  if (error) {
    return { ok: false, message: messageForGrowthError(error.code) };
  }

  revalidatePath("/collection");
  return { ok: true };
}

/** 4凸の個体を次の★へ進化させる。 */
export async function evolveCharacterAction(
  userCharacterId: string,
): Promise<GrowthActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("evolve_character", {
    p_user_character_id: userCharacterId,
  });

  if (error) {
    return { ok: false, message: messageForGrowthError(error.code) };
  }

  revalidatePath("/collection");
  return { ok: true };
}
