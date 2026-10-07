import type { Database } from "@/types/database.types";

type CharacterRarity = Database["public"]["Enums"]["character_rarity"];

/** 1つの★で上げられる凸数。4凸で次の★へ進化できる。 */
export const MAX_RANK = 4;
/** ★の上限。0=★1、2=★3。 */
export const MAX_TIER = 2;

// supabase/migrations/*_character_merge_and_evolution.sql の
// private.growth_percent_per_step / private.merge_rank_gain と同じ値。
// 片方だけ変えると、図鑑の表示とバトルの実数が黙ってずれる。

/** 進行度1段あたりの伸び率（%）。 */
export const GROWTH_PERCENT_PER_STEP: Record<CharacterRarity, number> = {
  common: 5,
  rare: 7,
  epic: 8,
  legendary: 10,
};

/** 合成1回で上がる凸数。高レアほど重複を引きにくいので、少ない素材で育つ。 */
export const MERGE_RANK_GAIN: Record<CharacterRarity, number> = {
  common: 1,
  rare: 1,
  epic: 2,
  legendary: 4,
};

export type BaseStats = {
  hp: number;
  power: number;
  speed: number;
};

export type GrowthState = {
  tier: number;
  rank: number;
};

/**
 * ★と凸をまとめた進行度（0〜12）。
 *
 * ★1・4凸 と ★2・0凸 は同じ値になる。進化直後に弱くならないのはこのため。
 */
export function growthStep({ tier, rank }: GrowthState): number {
  return tier * MAX_RANK + rank;
}

/**
 * 個体値に★と凸を掛けた実効値。DB の private.effective_stat と同じ整数演算で四捨五入する。
 * 浮動小数で掛けると、境界の値で SQL 側と1ずれることがある。
 */
export function effectiveStat(
  base: number,
  rarity: CharacterRarity,
  growth: GrowthState,
): number {
  const percent = 100 + GROWTH_PERCENT_PER_STEP[rarity] * growthStep(growth);
  return Math.floor((base * percent + 50) / 100);
}

export function effectiveStats(
  base: BaseStats,
  rarity: CharacterRarity,
  growth: GrowthState,
): BaseStats {
  return {
    hp: effectiveStat(base.hp, rarity, growth),
    power: effectiveStat(base.power, rarity, growth),
    speed: effectiveStat(base.speed, rarity, growth),
  };
}

/** 素材にすると育成分が失われる個体か。合成前に警告を出す対象。 */
export function isEnhanced({ tier, rank }: GrowthState): boolean {
  return tier > 0 || rank > 0;
}

export function canEvolve({ tier, rank }: GrowthState): boolean {
  return rank >= MAX_RANK && tier < MAX_TIER;
}

export function isFullyGrown({ tier, rank }: GrowthState): boolean {
  return rank >= MAX_RANK && tier >= MAX_TIER;
}

/**
 * 個体値の総合点。HP は他の2値の12倍の桁で振られるので、12で割って重みを揃える。
 * 「素材の方が当たり個体かもしれない」の判定にだけ使う。
 */
export function baseStatScore({ hp, power, speed }: BaseStats): number {
  return hp / 12 + power + speed;
}

type MergeableCharacter = GrowthState & {
  ownershipId: string;
  id: string;
  rarity: CharacterRarity;
  baseStats: BaseStats;
};

export type MergeBlockReason = "same-character" | "different-species" | "rank-overflow";

export type MergeWarning = "enhanced-material" | "material-has-better-base-stats";

export type MergeCheck =
  | { ok: true; nextRank: number; warnings: MergeWarning[] }
  | { ok: false; reason: MergeBlockReason };

/**
 * 合成できるかと、実行前に見せる警告を返す。
 *
 * サーバーも同じ条件で拒否する。ここは UI で先回りして理由を出すためのもので、
 * 安全性はサーバー側（merge_characters RPC）が持つ。
 */
export function checkMerge(
  base: MergeableCharacter,
  material: MergeableCharacter,
): MergeCheck {
  if (base.ownershipId === material.ownershipId) {
    return { ok: false, reason: "same-character" };
  }
  if (base.id !== material.id) {
    return { ok: false, reason: "different-species" };
  }

  const nextRank = base.rank + MERGE_RANK_GAIN[base.rarity];
  if (nextRank > MAX_RANK) {
    return { ok: false, reason: "rank-overflow" };
  }

  const warnings: MergeWarning[] = [];
  if (isEnhanced(material)) {
    warnings.push("enhanced-material");
  }
  if (baseStatScore(material.baseStats) > baseStatScore(base.baseStats)) {
    warnings.push("material-has-better-base-stats");
  }

  return { ok: true, nextRank, warnings };
}
