import type { Database } from "@/types/database.types";

export type CharacterAttribute =
  Database["public"]["Enums"]["character_attribute"];

// 自動攻撃 / まもれ / 必殺準備中。コンボ入力は持たない。
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

// 1 tick = 500ms（等倍）。倍速は間隔だけ短くする。ダメージとタイムアップは tick 回数だけで決まる。
export const TICK_INTERVAL_MS = 500;
export const BATTLE_SPEEDS = [1, 2] as const;
export type BattleSpeed = (typeof BATTLE_SPEEDS)[number];
export const DEFAULT_BATTLE_SPEED: BattleSpeed = 1;
export const BATTLE_SPEED_STORAGE_KEY = "poop-battler.battle-speed";
export const HIT_MOTION_MS = 350;

export const TIMEOUT_MS = 90_000;
export const GUARD_DURATION_MS = 10_000;
export const GUARD_COOLDOWN_MS = 15_000;
export const SWITCH_STUN_MS = 1_000;
// 踏ん張り積算（約10秒）より長くし、振り切る前に時間切れしない（Issue #94）。
export const PLAYER_SPECIAL_CHARGE_MS = 15_000;
export const ENEMY_SPECIAL_TELEGRAPH_MS = 2_000;

export const TYPE_ADVANTAGE = 1.5;
export const TYPE_NEUTRAL = 1;
export const TYPE_DISADVANTAGE = 0.75;

export const GUARD_INCOMING_MULTIPLIER = 0.5;
export const GUARD_OUTGOING_MULTIPLIER = 0;

export const AUTO_ATTACK_DAMAGE = 20;
export const AUTO_ATTACK_PERIOD_TICKS = 5;
export const BASE_SPEED = 20;
export const MIN_AUTO_ATTACK_PERIOD_TICKS = 2;
export const MAX_AUTO_ATTACK_PERIOD_TICKS = 10;
export const AUTO_ATTACK_CHANCE = 0.5;
export const SPECIAL_BASE_DAMAGE = 4;
export const SPECIAL_DAMAGE_MULTIPLIER = 10;
export const SPECIAL_GAUGE_MAX = 100;
export const SPECIAL_GAUGE_PER_TICK = 2;

// ベンチ回復: 場に出ていない味方のHP・必殺ゲージを毎ティック少しずつ回復する。
// 戦闘不能（HP 0）のキャラは回復しない。
export const BENCH_HP_RECOVERY_RATE = 0.01; // maxHp の 1% / tick
export const BENCH_GAUGE_RECOVERY_PER_TICK = 1; // 場の半分のペースでゲージ回復

// 通常攻撃は双方とも 5 tick ごとの窓で半々。1発 20。
// 必殺は従来の基礎 4 に倍率を掛ける。タイムアップは 180 tick（等倍で 90秒）。
// 1体でも残っていれば完了し、敗北は3体全滅だけ（Issue #102）。
export const INITIAL_ENEMY_HP = 480;
export const INITIAL_MEMBER_HP = 240;

// レンタル個体の3値。所有行が無いので、DBではなくここが出所になる（Issue #73）。
// 抽選もされないため、この値は常に一定。
export const RENTAL_HP = INITIAL_MEMBER_HP;
export const RENTAL_POWER = AUTO_ATTACK_DAMAGE;
export const RENTAL_SPEED = BASE_SPEED;

export type AutoAttackSide = "player" | "enemy";

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

export const TIMEOUT_TICKS = msToTicks(TIMEOUT_MS);

export function specialChargeTicks(speed: BattleSpeed): number {
  return msToTicks(PLAYER_SPECIAL_CHARGE_MS * speed);
}

export function isBattleSpeed(value: unknown): value is BattleSpeed {
  return value === 1 || value === 2;
}

export function tickIntervalMs(speed: BattleSpeed): number {
  return TICK_INTERVAL_MS / speed;
}

export function scaleByBattleSpeed(value: number, speed: BattleSpeed): number {
  return value / speed;
}

export function nextBattleSpeed(speed: BattleSpeed): BattleSpeed {
  return speed === 1 ? 2 : 1;
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
  baseDamage?: number;
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
  const baseDamage =
    input.baseDamage ??
    (input.isSpecial ? SPECIAL_BASE_DAMAGE : AUTO_ATTACK_DAMAGE);

  return Math.floor(
    baseDamage * typeMod * outgoingMod * incomingMod * specialMod,
  );
}

function unitIntervalHash(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4_294_967_296;
}

/**
 * Speed から通常攻撃の待ちティックを求める（Issue #73）。
 *
 * BASE_SPEED (20) がちょうど既定の 5 ティック。Speed が上がるほど待ちは短く、
 * 反比例で減らす。極端な個体で 1 ティック連打や事実上の無攻撃にならないよう、
 * 2〜10 ティックに丸める。
 */
export function autoAttackPeriodTicks(speed: number): number {
  if (!Number.isFinite(speed) || speed <= 0) {
    return MAX_AUTO_ATTACK_PERIOD_TICKS;
  }

  const period = Math.round((AUTO_ATTACK_PERIOD_TICKS * BASE_SPEED) / speed);

  return Math.min(
    MAX_AUTO_ATTACK_PERIOD_TICKS,
    Math.max(MIN_AUTO_ATTACK_PERIOD_TICKS, period),
  );
}

export function shouldAutoAttack(
  battleId: string,
  elapsedTicks: number,
  side: AutoAttackSide,
  periodTicks: number = AUTO_ATTACK_PERIOD_TICKS,
): boolean {
  if (elapsedTicks <= 0 || elapsedTicks % periodTicks !== 0) {
    return false;
  }

  return (
    unitIntervalHash(`${side}:${battleId}:${elapsedTicks}`) < AUTO_ATTACK_CHANCE
  );
}
