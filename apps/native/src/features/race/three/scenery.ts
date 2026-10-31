// 背景の自然（木・山・雲）の配置。見た目の位置だけを決める純関数で、シミュレーションには関わらない。
import type { CoursePoint } from "../types";
import { range, type Rng } from "../rng";

export interface SceneryItem {
  x: number;
  y: number;
  z: number;
  /** 大きさの倍率 */
  scale: number;
  /** 向き（ラジアン）。木・山は円錐なので見た目の差を出すだけ */
  yaw: number;
}

export const TREES = {
  spacing: 6,
  /** 観客(道の縁から最大 7m)の外側。S字の内側では道との距離が9mほど縮むので、その分を足してある */
  minMargin: 22,
  marginSpread: 30,
  /** 手前に密な林、奥にまばらな林、と濃淡が出るよう一部の点は飛ばす */
  skipChance: 0.35,
  minScale: 0.8,
  maxScale: 1.7,
  trunkRadius: 0.22,
  trunkHeight: 1.6,
  canopyRadius: 1.5,
  canopyHeight: 3.6,
} as const;

export const MOUNTAINS = {
  spacing: 50,
  /** fog の終わり(190m)より手前、カメラの far(220m)に収まる範囲 */
  minDistance: 120,
  distanceSpread: 40,
  minHeight: 34,
  maxHeight: 62,
  radiusRatio: 0.85,
  /** 山頂の雪の高さの割合 */
  capRatio: 0.3,
} as const;

export const CLOUDS = {
  spacing: 60,
  minAltitude: 38,
  altitudeSpread: 22,
  maxLateral: 140,
  minScale: 7,
  maxScale: 14,
} as const;

const SIDES = [-1, 1] as const;

function offsetFrom(point: CoursePoint, side: -1 | 1, distance: number): { x: number; z: number } {
  return { x: point.x - Math.sin(point.h) * side * distance, z: point.z + Math.cos(point.h) * side * distance };
}

/** 道の両脇の林。つり橋の下は水なので、橋の区間には置かない */
export function placeTrees(points: readonly CoursePoint[], rng: Rng): SceneryItem[] {
  const items: SceneryItem[] = [];
  points.forEach((point, i) => {
    if (i % TREES.spacing !== 0 || point.zone === "bridge") return;
    for (const side of SIDES) {
      // 乱数の消費順を固定するため、飛ばす場合も先に全部引く
      const skip = rng() < TREES.skipChance;
      const margin = TREES.minMargin + rng() * TREES.marginSpread;
      const scale = range(rng, TREES.minScale, TREES.maxScale);
      const yaw = rng() * Math.PI * 2;
      if (skip) continue;
      const { x, z } = offsetFrom(point, side, point.w / 2 + margin);
      items.push({ x, y: 0, z, scale, yaw });
    }
  });
  return items;
}

/** コースの遠くに連なる山。scale は山の高さ(m) */
export function placeMountains(points: readonly CoursePoint[], rng: Rng): SceneryItem[] {
  const items: SceneryItem[] = [];
  points.forEach((point, i) => {
    if (i % MOUNTAINS.spacing !== 0) return;
    for (const side of SIDES) {
      const distance = MOUNTAINS.minDistance + rng() * MOUNTAINS.distanceSpread;
      const scale = range(rng, MOUNTAINS.minHeight, MOUNTAINS.maxHeight);
      const yaw = rng() * Math.PI * 2;
      const { x, z } = offsetFrom(point, side, distance);
      items.push({ x, y: 0, z, scale, yaw });
    }
  });
  return items;
}

/** 空に浮かぶ雲。scale は雲の横幅(m)。道の上空にも流れる */
export function placeClouds(points: readonly CoursePoint[], rng: Rng): SceneryItem[] {
  const items: SceneryItem[] = [];
  points.forEach((point, i) => {
    if (i % CLOUDS.spacing !== 0) return;
    const lateral = range(rng, -CLOUDS.maxLateral, CLOUDS.maxLateral);
    const altitude = CLOUDS.minAltitude + rng() * CLOUDS.altitudeSpread;
    const scale = range(rng, CLOUDS.minScale, CLOUDS.maxScale);
    const yaw = rng() * Math.PI * 2;
    const { x, z } = offsetFrom(point, 1, lateral);
    items.push({ x, y: altitude, z, scale, yaw });
  });
  return items;
}
