import { describe, expect, it } from "vitest";
import { generateCourseFromSeed } from "../course";
import type { CoursePoint } from "../types";
import { buildCurb, buildRoad, CURB_COLORS, curbColor } from "./course-mesh";

const SEED = 7;

const point = (s: number, overrides: Partial<CoursePoint> = {}): CoursePoint => ({ x: s, z: 0, y: 0, h: 0, k: 0, w: 11, s, kind: "watch", ...overrides });
const line = (count: number, overrides: Partial<CoursePoint> = {}) => Array.from({ length: count }, (_, i) => point(i, overrides));

describe("buildRoad", () => {
  it("点が2倍になると頂点数も2倍になる", () => {
    const few = buildRoad(line(10));

    const many = buildRoad(line(20));

    expect(many.positions.length).toBe(few.positions.length * 2);
  });

  it("点1つにつき頂点が2つ並ぶ", () => {
    const road = buildRoad(line(10));

    expect(road.positions.length / 3).toBe(20);
  });

  it("道幅 w の点で左右の頂点の距離が w になる", () => {
    const wide = point(0, { w: 6.5, h: 0.7 });

    const { positions } = buildRoad([wide]);

    const distance = Math.hypot(positions[0] - positions[3], positions[1] - positions[4], positions[2] - positions[5]);
    expect(distance).toBeCloseTo(6.5);
  });

  it("実際のコースでも全部の点で左右の距離が道幅と一致する", () => {
    const { points } = generateCourseFromSeed(SEED);

    const { positions } = buildRoad(points);

    const gaps = points.map((p, i) => Math.hypot(positions[i * 6] - positions[i * 6 + 3], positions[i * 6 + 2] - positions[i * 6 + 5]) - p.w);
    expect(Math.max(...gaps.map(Math.abs))).toBeLessThan(1e-4);
  });

  it("三角形の頂点番号が頂点数を超えない", () => {
    const road = buildRoad(line(10));

    expect(Math.max(...road.indices)).toBe(19);
  });
});

describe("buildCurb", () => {
  it("点が2倍になると頂点数も2倍になる", () => {
    const few = buildCurb(line(10), 1);

    const many = buildCurb(line(20), 1);

    expect(many.positions.length).toBe(few.positions.length * 2);
  });

  it("左右の縁石は道の反対側に立つ", () => {
    const left = buildCurb([point(0)], -1);
    const right = buildCurb([point(0)], 1);

    expect(left.positions[2] * right.positions[2]).toBeLessThan(0);
  });
});

describe("curbColor", () => {
  const stripe = 3;

  it("S字の見るだけ区間は青白になる", () => {
    expect(curbColor(point(stripe, { terrain: "snake" }))).toEqual(CURB_COLORS.blue);
  });

  it("坂の見るだけ区間は橙白になる", () => {
    expect(curbColor(point(stripe, { terrain: "uphill" }))).toEqual(CURB_COLORS.orange);
  });

  it("つり橋は縞に関係なく木の色になる", () => {
    expect(curbColor(point(0, { kind: "zone", zone: "bridge" }))).toEqual(CURB_COLORS.wood);
  });

  it("直線の区間は白のままになる", () => {
    expect(curbColor(point(stripe, { terrain: "straight" }))).toEqual(CURB_COLORS.white);
  });

  it("縞の白い側では青白の区間も白になる", () => {
    expect(curbColor(point(0, { terrain: "snake" }))).toEqual(CURB_COLORS.white);
  });
});
