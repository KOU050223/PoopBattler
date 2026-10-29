// 道と縁石のジオメトリ用データを作る純関数。three には依存しない（テストできるように、配列を返すだけ）。
// 試作 race-minigame.html の ribbon / roadColor / railColor に対応する。
import type { CoursePoint } from "../types";

export type Rgb = readonly [number, number, number];

export interface RibbonData {
  /** xyz を並べたもの。点 i の左右（または下上）が 2i, 2i+1 番目の頂点 */
  positions: Float32Array;
  /** rgb を並べたもの（頂点と同じ並び） */
  colors: Float32Array;
  indices: Uint16Array;
}

const ROAD_SURFACE_LIFT = 0.02;
const CURB_HEIGHT = 0.55;
const CURB_OFFSET = 0.15;
/** 縞の長さ（m）。試作どおり道は 8m、ダッシュ帯は 4m、橋の板は 2m、縁石は 3m */
const ROAD_STRIPE_LENGTH = 8;
const DASH_STRIPE_LENGTH = 4;
const PLANK_STRIPE_LENGTH = 2;
const CURB_STRIPE_LENGTH = 3;
const MAX_VERTICES = 65535;

export function hexToRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

export const ROAD_COLORS = {
  base: hexToRgb("#ffd0e3"),
  alt: hexToRgb("#ffc4dc"),
  bridge: hexToRgb("#e9d2b0"),
  bridgeAlt: hexToRgb("#dcc29c"),
  dash: hexToRgb("#ffb3d0"),
} as const;

export const CURB_COLORS = {
  white: hexToRgb("#ffffff"),
  blue: hexToRgb("#1cb0f6"),
  orange: hexToRgb("#ffa53c"),
  wood: hexToRgb("#a77b4f"),
} as const;

const isOddStripe = (s: number, length: number) => Math.floor(s / length) % 2 === 1;

export function roadColor(point: CoursePoint): Rgb {
  if (point.zone === "bridge") return isOddStripe(point.s, PLANK_STRIPE_LENGTH) ? ROAD_COLORS.bridge : ROAD_COLORS.bridgeAlt;
  if (point.zone === "dash") return isOddStripe(point.s, DASH_STRIPE_LENGTH) ? ROAD_COLORS.dash : ROAD_COLORS.base;
  return isOddStripe(point.s, ROAD_STRIPE_LENGTH) ? ROAD_COLORS.alt : ROAD_COLORS.base;
}

/** 区間の種類で縁石の色を変える（S字は青白、坂は橙白、つり橋は木の色。race.md 2章） */
export function curbColor(point: CoursePoint): Rgb {
  if (point.zone === "bridge") return CURB_COLORS.wood;
  const isStripe = isOddStripe(point.s, CURB_STRIPE_LENGTH);
  if (point.zone === "swipe" || point.terrain === "snake") return isStripe ? CURB_COLORS.blue : CURB_COLORS.white;
  if (point.terrain === "uphill") return isStripe ? CURB_COLORS.orange : CURB_COLORS.white;
  return CURB_COLORS.white;
}

/** 中心線の点ごとに2頂点ずつ出し、隣の点と四角（三角2枚）でつなぐ */
function buildRibbon(points: readonly CoursePoint[], makeEdge: (point: CoursePoint, nx: number, nz: number) => readonly [readonly number[], readonly number[], Rgb]): RibbonData {
  if (points.length * 2 > MAX_VERTICES) throw new Error(`点が多すぎて Uint16 の頂点番号に収まらない（${points.length} 点）`);
  const positions = new Float32Array(points.length * 6);
  const colors = new Float32Array(points.length * 6);
  const indices = new Uint16Array(Math.max(0, points.length - 1) * 6);
  points.forEach((point, i) => {
    const [first, second, color] = makeEdge(point, -Math.sin(point.h), Math.cos(point.h));
    positions.set(first, i * 6);
    positions.set(second, i * 6 + 3);
    colors.set(color, i * 6);
    colors.set(color, i * 6 + 3);
    if (i === 0) return;
    const k = i * 2;
    indices.set([k - 2, k - 1, k, k - 1, k + 1, k], (i - 1) * 6);
  });
  return { positions, colors, indices };
}

/** 道の面。点 i の頂点は 2i が左（nx 側が正）、2i+1 が右 */
export function buildRoad(points: readonly CoursePoint[]): RibbonData {
  return buildRibbon(points, (p, nx, nz) => {
    const half = p.w / 2;
    return [[p.x + nx * half, p.y + ROAD_SURFACE_LIFT, p.z + nz * half], [p.x - nx * half, p.y + ROAD_SURFACE_LIFT, p.z - nz * half], roadColor(p)] as const;
  });
}

/** 縁石（道の外側に立つ縦の帯）。side は -1（左）か 1（右） */
export function buildCurb(points: readonly CoursePoint[], side: -1 | 1): RibbonData {
  return buildRibbon(points, (p, nx, nz) => {
    const offset = (p.w / 2 + CURB_OFFSET) * side;
    const x = p.x + nx * offset;
    const z = p.z + nz * offset;
    return [[x, p.y, z], [x, p.y + CURB_HEIGHT, z], curbColor(p)] as const;
  });
}
