import type { Database } from "@/types/database.types";

export type CharacterAttribute =
  Database["public"]["Enums"]["character_attribute"];

// たたかえ / まもれ / 必殺準備中。コンボ入力は持たない。
export type BattleStance = "fight" | "guard" | "special";

// 敵として出現しうる属性。食事ログは参照せず、ここから一様に抽選する（Issue #21）。
//
// "normal" もプールに含める。マスターには "normal" 属性のキャラクターが
// 複数seedされており、「食事写真ゼロでも遊べる」通常ケースの敵として出す。
// フォールバック専用の予備属性ではない。
export const ENEMY_ATTRIBUTES: readonly CharacterAttribute[] = [
  "curry",
  "vegetable",
  "spicy",
  "meat",
  "sweet",
  "dairy",
  "normal",
] as const;

// 属性に一致するキャラクターがマスターに1件もない場合の最終手段。
// seed.sql が投入する "normal" 属性のキャラクターを指す。
export const FALLBACK_ATTRIBUTE: CharacterAttribute = "normal";

export const ATTRIBUTE_LABELS: Record<CharacterAttribute, string> = {
  spicy: "激辛",
  meat: "肉",
  vegetable: "野菜",
  dairy: "乳",
  sweet: "甘",
  curry: "カレー",
  normal: "無",
};

export type MatchupTone = "advantage" | "neutral" | "disadvantage";

export function matchupTone(
  attacker: CharacterAttribute,
  defender: CharacterAttribute,
): MatchupTone {
  const multiplier = typeMultiplier(attacker, defender);
  if (multiplier > TYPE_NEUTRAL) {
    return "advantage";
  }
  if (multiplier < TYPE_NEUTRAL) {
    return "disadvantage";
  }
  return "neutral";
}

export const PARTY_SIZE = 3;

// 1 tick = 500ms。UI の間隔もこれに合わせる。ダメージは tick 回数だけで決まる。
export const TICK_INTERVAL_MS = 500;

export const TIMEOUT_MS = 90_000;
export const GUARD_DURATION_MS = 10_000;
export const GUARD_COOLDOWN_MS = 15_000;
export const SWITCH_STUN_MS = 1_000;
export const PLAYER_SPECIAL_CHARGE_MS = 3_000;
export const ENEMY_SPECIAL_TELEGRAPH_MS = 2_000;

export const TYPE_ADVANTAGE = 1.5;
export const TYPE_NEUTRAL = 1;
export const TYPE_DISADVANTAGE = 0.75;

export const GUARD_INCOMING_MULTIPLIER = 0.5;
export const GUARD_OUTGOING_MULTIPLIER = 0;

export const AUTO_ATTACK_DAMAGE = 4;
export const SPECIAL_DAMAGE_MULTIPLIER = 10;
export const SPECIAL_GAUGE_MAX = 100;
export const SPECIAL_GAUGE_PER_TICK = 2;

// 無操作（双方たたかえ）の長さ:
// 有利 1.5 なら floor(4*1.5)=6/tick、480HP / 6 = 80 tick = 40秒で敵撃破。
// 等倍なら 4/tick、480/4 = 120 tick = 60秒。タイムアップ 90秒は残HP判定用。
// 味方1体 240HP / 4 = 60 tick。3体+交代硬直で無操作の全滅は約90秒。
export const INITIAL_ENEMY_HP = 480;
export const INITIAL_MEMBER_HP = 240;

// 6属性の輪。時計回りに隣2つが有利、反時計回りに隣2つが不利。
export const TYPE_WHEEL = [
  "spicy",
  "meat",
  "vegetable",
  "dairy",
  "sweet",
  "curry",
] as const;

export type WheelAttribute = (typeof TYPE_WHEEL)[number];

export function msToTicks(ms: number): number {
  return Math.floor(ms / TICK_INTERVAL_MS);
}

export function typeMultiplier(
  attacker: CharacterAttribute,
  defender: CharacterAttribute,
): number {
  if (attacker === "normal" || defender === "normal") {
    return TYPE_NEUTRAL;
  }

  const attackerIndex = TYPE_WHEEL.indexOf(attacker as WheelAttribute);
  const defenderIndex = TYPE_WHEEL.indexOf(defender as WheelAttribute);

  if (attackerIndex < 0 || defenderIndex < 0) {
    return TYPE_NEUTRAL;
  }

  const clockwise = (defenderIndex - attackerIndex + TYPE_WHEEL.length) %
    TYPE_WHEEL.length;

  if (clockwise === 1 || clockwise === 2) {
    return TYPE_ADVANTAGE;
  }

  if (clockwise === 4 || clockwise === 5) {
    return TYPE_DISADVANTAGE;
  }

  return TYPE_NEUTRAL;
}

export function computeAttackDamage(input: {
  attackerAttribute: CharacterAttribute;
  defenderAttribute: CharacterAttribute;
  attackerStance: BattleStance;
  defenderStance: BattleStance;
  isSpecial?: boolean;
}): number {
  const typeMod = typeMultiplier(
    input.attackerAttribute,
    input.defenderAttribute,
  );
  const outgoingMod =
    input.attackerStance === "guard" ? GUARD_OUTGOING_MULTIPLIER : 1;
  const incomingMod =
    input.defenderStance === "guard" ? GUARD_INCOMING_MULTIPLIER : 1;
  const specialMod = input.isSpecial ? SPECIAL_DAMAGE_MULTIPLIER : 1;

  return Math.floor(
    AUTO_ATTACK_DAMAGE * typeMod * outgoingMod * incomingMod * specialMod,
  );
}
