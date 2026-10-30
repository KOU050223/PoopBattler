// 観客（2Dうんちくん）の配置。試作は道の脇に12m間隔で左右交互に置くが、こちらは両側に置く（DIFFS.md）。
// 見た目の位置だけを決める純関数で、シミュレーションには関わらない。
import type { CoursePoint } from "../types";
import type { Rng } from "../rng";
import { CROWD_VARIANTS } from "./crowd-sprite";

export interface CrowdItem {
  x: number;
  y: number;
  z: number;
  /** 跳ねる位相の違い */
  phase: number;
  /** 絵柄（0〜CROWD_VARIANTS-1）。見た目だけ */
  variant: number;
}

export const CROWD = {
  spacing: 12,
  /** 道の縁からこの距離＋乱数分だけ外に置く。S字の内側でも道に乗らない距離（シード300本で、観客の中心と道の縁は最小1.1m空く）*/
  minMargin: 3,
  marginSpread: 4,
  phaseCount: 7,
  /** スプライトの大きさ（正方形）。足元が地面に付く */
  spriteSize: 2,
  spriteHalfWidth: 0.9,
  nearDistance: 30,
  hopHeight: 0.4,
  hopSpeed: 9,
} as const;

const SIDES = [-1, 1] as const;

/** 同じ rng・同じコースなら同じ配置。つり橋の区間には置かない（橋の下は水） */
export function placeCrowd(points: readonly CoursePoint[], rng: Rng): CrowdItem[] {
  const items: CrowdItem[] = [];
  points.forEach((point, i) => {
    if (i % CROWD.spacing !== 0 || point.zone === "bridge") return;
    for (const side of SIDES) {
      const margin = CROWD.minMargin + rng() * CROWD.marginSpread;
      const phase = Math.floor(rng() * CROWD.phaseCount);
      const variant = Math.floor(rng() * CROWD_VARIANTS);
      const distance = point.w / 2 + margin;
      const x = point.x - Math.sin(point.h) * side * distance;
      const z = point.z + Math.cos(point.h) * side * distance;
      items.push({ x, y: point.y, z, phase, variant });
    }
  });
  return items;
}

/** 走者の近くの観客だけ跳ねる（reduce motion では跳ねない） */
export function crowdHop(item: CrowdItem, timeSec: number, distanceToPlayer: number, isReducedMotion: boolean): number {
  if (isReducedMotion || distanceToPlayer >= CROWD.nearDistance) return 0;
  return Math.max(0, Math.sin(timeSec * CROWD.hopSpeed + item.phase)) * CROWD.hopHeight;
}
