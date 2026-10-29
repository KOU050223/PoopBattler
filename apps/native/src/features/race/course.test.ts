import { describe, expect, it } from "vitest";
import { COURSE } from "./config";
import { generateCourseFromSeed } from "./course";

const SEEDS = Array.from({ length: 50 }, (_, i) => i + 1);
/** 区間の境目で許す高さの差。つり橋の出口が smooth(1/6)×1.3 ≒ 0.096 残るため（DIFFS.md） */
const MAX_BOUNDARY_DY = 0.1;
/** 区間の境目で許す向きの差。見るだけのS字の1mあたり最大曲率 0.8×2π/30 ≒ 0.168 と、ミニゲームS字の 0.183 を超えない値 */
const MAX_BOUNDARY_DH = 0.2;

function boundaries(seed: number) {
  const { points, sections } = generateCourseFromSeed(seed);
  return sections.slice(1).map((section) => ({
    previous: points[section.startS - 1],
    next: points[section.startS],
  }));
}

describe("コース生成", () => {
  it("同じシードなら同じコースになる", () => {
    expect(generateCourseFromSeed(5)).toEqual(generateCourseFromSeed(5));
  });

  it("シードを変えると区間の並びが変わるものがある", () => {
    const layouts = new Set(SEEDS.map((seed) => JSON.stringify(generateCourseFromSeed(seed).sections)));
    expect(layouts.size).toBeGreaterThan(1);
  });

  it("全長は32+90+48+150+48+150+48+150=716mで、点は1m間隔で並ぶ", () => {
    expect(generateCourseFromSeed(1).points.map((p) => p.s)).toEqual(Array.from({ length: 716 }, (_, i) => i));
  });

  it("ゴールは終端の20m手前にある", () => {
    expect(generateCourseFromSeed(1).finishS).toBe(696);
  });

  it("見るだけの区間（スタート32m・ミニゲーム48mは対象外）の長さはすべて30の倍数", () => {
    const lengths = SEEDS.flatMap((seed) =>
      generateCourseFromSeed(seed).sections.filter((s) => s.kind === "watch").map((s) => s.length % COURSE.terrainWaveLength),
    );
    expect(lengths.every((rest) => rest === 0)).toBe(true);
  });

  it("区間の境目で高さの差が閾値以下（段差が無い）", () => {
    const maxDy = Math.max(...SEEDS.flatMap((seed) => boundaries(seed).map((b) => Math.abs(b.next.y - b.previous.y))));
    expect(maxDy).toBeLessThanOrEqual(MAX_BOUNDARY_DY);
  });

  it("区間の境目で向きの差が閾値以下（ずれが無い）", () => {
    const maxDh = Math.max(...SEEDS.flatMap((seed) => boundaries(seed).map((b) => Math.abs(b.next.h - b.previous.h))));
    expect(maxDh).toBeLessThanOrEqual(MAX_BOUNDARY_DH);
  });

  it("見るだけの最初の3つは直線・坂・S字が1回ずつ出る", () => {
    const results = SEEDS.map((seed) =>
      generateCourseFromSeed(seed).sections.filter((s) => s.kind === "watch").slice(0, 3).map((s) => s.terrain).sort().join(),
    );
    expect(new Set(results)).toEqual(new Set(["snake,straight,uphill"]));
  });

  it("ミニゲームは3つで、種類は重ならない", () => {
    const zones = generateCourseFromSeed(2).sections.filter((s) => s.kind === "zone").map((s) => s.zone);
    expect(new Set(zones).size).toBe(3);
  });

  it("ハードルは区間の30%・58%・86%の位置にある", () => {
    const course = generateCourseFromSeed(findSeedWith("hurdle"));
    const zone = course.sections.find((s) => s.zone === "hurdle")!;
    const ratios = course.hurdles.map((h) => (h.s - zone.startS) / zone.length);
    expect(ratios.every((ratio, i) => Math.abs(ratio - [0.3, 0.58, 0.86][i]) < 1e-9)).toBe(true);
  });

  it("つり橋の中央の幅は6.5m", () => {
    const course = generateCourseFromSeed(findSeedWith("bridge"));
    const zone = course.sections.find((s) => s.zone === "bridge")!;
    expect(course.points[zone.startS + zone.length / 2].w).toBe(COURSE.bridgeWidth);
  });

  it("つり橋の中央の高さは1.3m", () => {
    const course = generateCourseFromSeed(findSeedWith("bridge"));
    const zone = course.sections.find((s) => s.zone === "bridge")!;
    expect(course.points[zone.startS + zone.length / 2].y).toBeCloseTo(1.3);
  });

  it("坂は区間の中ほど(15m地点)で3.2mの高さになる", () => {
    const course = generateCourseFromSeed(1);
    const hill = course.sections.find((s) => s.terrain === "uphill")!;
    expect(course.points[hill.startS + 15].y).toBeCloseTo(3.2);
  });

  it("見るだけのS字は区間番号が奇数だと左右が反転する（最初の曲率の符号）", () => {
    const signs = SEEDS.flatMap((seed) => {
      const course = generateCourseFromSeed(seed);
      return course.sections
        .filter((s) => s.kind === "watch")
        .flatMap((s, watchIndex) =>
          s.terrain === "snake" ? [Math.sign(course.points[s.startS].k) === (watchIndex % 2 ? -1 : 1)] : [],
        );
    });
    expect(signs.every(Boolean) && signs.length > 0).toBe(true);
  });
});

function findSeedWith(zone: string): number {
  const seed = SEEDS.find((candidate) => generateCourseFromSeed(candidate).sections.some((s) => s.zone === zone));
  if (seed === undefined) throw new Error(`${zone} を含むコースがシード候補に無い`);
  return seed;
}
