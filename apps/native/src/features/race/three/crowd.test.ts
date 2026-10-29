import { describe, expect, it } from "vitest";
import { generateCourseFromSeed } from "../course";
import { createRng } from "../rng";
import { CROWD, crowdHop, placeCrowd } from "./crowd";

const COURSE_SEEDS = [1, 7, 42, 20260101, 999];
const CROWD_SEED = 5;

describe("placeCrowd", () => {
  it("同じシードなら同じ配置になる", () => {
    const { points } = generateCourseFromSeed(1);

    const first = placeCrowd(points, createRng(CROWD_SEED));
    const second = placeCrowd(points, createRng(CROWD_SEED));

    expect(second).toEqual(first);
  });

  it("シードが違えば配置も変わる", () => {
    const { points } = generateCourseFromSeed(1);

    const first = placeCrowd(points, createRng(CROWD_SEED));
    const second = placeCrowd(points, createRng(CROWD_SEED + 1));

    expect(second).not.toEqual(first);
  });

  it.each(COURSE_SEEDS)("コース%i: 観客はどの道の点の幅にも乗らない", (seed) => {
    const { points } = generateCourseFromSeed(seed);

    const items = placeCrowd(points, createRng(CROWD_SEED));

    const shortestMargin = Math.min(...items.map((item) => Math.min(...points.map((p) => Math.hypot(p.x - item.x, p.z - item.z) - p.w / 2))));
    expect(shortestMargin).toBeGreaterThan(CROWD.rollRadius);
  });

  it("つり橋だけの道には置かない", () => {
    const bridge = Array.from({ length: 100 }, (_, i) => ({ x: i, z: 0, y: 1.3, h: 0, k: 0, w: 6.5, s: i, kind: "zone" as const, zone: "bridge" as const }));

    expect(placeCrowd(bridge, createRng(CROWD_SEED))).toEqual([]);
  });

  it("コースに観客が1人以上置かれる", () => {
    const { points } = generateCourseFromSeed(1);

    expect(placeCrowd(points, createRng(CROWD_SEED)).length).toBeGreaterThan(0);
  });
});

describe("crowdHop", () => {
  const item = { x: 0, y: 0, z: 0, phase: 0 };
  const peakTime = Math.PI / 2 / CROWD.hopSpeed;

  it("近くにいるとき跳ねる", () => {
    expect(crowdHop(item, peakTime, 5, false)).toBeCloseTo(CROWD.hopHeight);
  });

  it("遠いときは跳ねない", () => {
    expect(crowdHop(item, peakTime, CROWD.nearDistance, false)).toBe(0);
  });

  it("reduce motion では跳ねない", () => {
    expect(crowdHop(item, peakTime, 5, true)).toBe(0);
  });
});
