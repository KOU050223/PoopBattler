import {
  ENEMY_ATTRIBUTES,
  type CharacterAttribute,
} from "./battle.constants";

// 乱数はテストのために注入する。既定は Math.random。
// 返す値は [0, 1) であることを前提にする。
export type RandomSource = () => number;

/**
 * 敵の属性をサーバー側で決める。食事ログは参照しない（Issue #21）。
 *
 * ENEMY_ATTRIBUTES から一様に選ぶ。乱数が [0,1) の範囲外を返しても
 * 添字が配列外へ出ないようにクランプする。
 */
export function selectEnemyAttribute(
  random: RandomSource = Math.random,
): CharacterAttribute {
  const index = Math.floor(random() * ENEMY_ATTRIBUTES.length);
  const safeIndex = Math.min(Math.max(index, 0), ENEMY_ATTRIBUTES.length - 1);

  return ENEMY_ATTRIBUTES[safeIndex];
}

/**
 * 属性が一致する候補から1体選ぶ。候補が空なら null を返し、
 * フォールバックの判断は呼び出し側（actions.ts）に委ねる。
 */
export function selectCharacterFrom<T>(
  candidates: readonly T[],
  random: RandomSource = Math.random,
): T | null {
  if (candidates.length === 0) return null;

  const index = Math.floor(random() * candidates.length);
  const safeIndex = Math.min(Math.max(index, 0), candidates.length - 1);

  return candidates[safeIndex];
}
