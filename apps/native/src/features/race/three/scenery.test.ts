import { describe, expect, it } from "vitest";
import { generateCourseFromSeed } from "../course";
import { createRng } from "../rng";
import { CROWD } from "./crowd";
import { MOUNTAINS, TREES, placeClouds, placeMountains, placeTrees } from "./scenery";

const COURSE_SEEDS = [1, 7, 42, 20260101, 999];
const SCENERY_SEED = 5;

function shortestGapToRoad(items: readonly { x: number; z: number }[], points: ReturnType<typeof generateCourseFromSeed>["points"]): number {
  return Math.min(...items.map((item) => Math.min(...points.map((p) => Math.hypot(p.x - item.x, p.z - item.z) - p.w / 2))));
}

describe("placeTrees", () => {
  it("同じシードなら同じ配置になる", () => {
    const { points } = generateCourseFromSeed(1);

    expect(placeTrees(points, createRng(SCENERY_SEED))).toEqual(placeTrees(points, createRng(SCENERY_SEED)));
  });

  it("シードが違えば配置も変わる", () => {
    const { points } = generateCourseFromSeed(1);

    expect(placeTrees(points, createRng(SCENERY_SEED + 1))).not.toEqual(placeTrees(points, createRng(SCENERY_SEED)));
  });

  it.each(COURSE_SEEDS)("コース%i: 木は道にも観客の位置にも乗らない", (seed) => {
    const { points } = generateCourseFromSeed(seed);

    const items = placeTrees(points, createRng(SCENERY_SEED));

    expect(items.length).toBeGreaterThan(0);
    // 観客の最も外側の位置より遠く、かつ最大の木の葉の広がりが観客に掛からない
    expect(shortestGapToRoad(items, points)).toBeGreaterThan(CROWD.minMargin + CROWD.marginSpread + TREES.canopyRadius * TREES.maxScale);
  });

  it("つり橋だけの道には置かない", () => {
    const bridge = Array.from({ length: 100 }, (_, i) => ({ x: i, z: 0, y: 1.3, h: 0, k: 0, w: 6.5, s: i, kind: "zone" as const, zone: "bridge" as const }));

    expect(placeTrees(bridge, createRng(SCENERY_SEED))).toEqual([]);
  });
});

describe("placeMountains", () => {
  it.each(COURSE_SEEDS)("コース%i: 山は道から離れた遠くにあり、fog の終わりより手前に収まる", (seed) => {
    const { points } = generateCourseFromSeed(seed);

    const items = placeMountains(points, createRng(SCENERY_SEED));

    expect(items.length).toBeGreaterThan(0);
    // 蛇行しても山の裾(底の半径)が道に掛からない
    const gap = shortestGapToRoad(items, points);
    expect(gap).toBeGreaterThan(MOUNTAINS.maxHeight * MOUNTAINS.radiusRatio);
  });

  it("同じシードなら同じ配置になる", () => {
    const { points } = generateCourseFromSeed(1);

    expect(placeMountains(points, createRng(SCENERY_SEED))).toEqual(placeMountains(points, createRng(SCENERY_SEED)));
  });
});

describe("placeClouds", () => {
  it("雲はすべて地面より上にある", () => {
    const { points } = generateCourseFromSeed(1);

    const items = placeClouds(points, createRng(SCENERY_SEED));

    expect(items.length).toBeGreaterThan(0);
    expect(Math.min(...items.map((item) => item.y))).toBeGreaterThan(0);
  });
});
