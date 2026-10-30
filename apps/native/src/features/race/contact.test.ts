import { describe, expect, it } from "vitest";
import { resolveContacts, resolveWalls } from "./contact";
import { createRace } from "./engine";
import { createRng } from "./rng";
import type { Runner } from "./types";

const STATS = { stamina: 5, power: 5, technique: 5 };
const SEED = 7;
const START_INDEX = 40;

/** スタート直後の直線。向き 0（+x）、中心線は z = 0 */
function setup() {
  const race = createRace({ seed: SEED, racers: { player: STATS }, collisions: true });
  const [a, b] = race.runners;
  const place = (runner: Runner, x: number, z: number, vx: number, vz = 0) => {
    Object.assign(runner, { x, z, vx, vz, h: 0, lat: z, s: x, trackIndex: START_INDEX, jumpUntil: 0 });
  };
  return { race, a, b, place, rng: createRng(1) };
}

describe("追突", () => {
  it("追突の反発は 0.05 で、離れる速さは接近速度の 5% になる", () => {
    const { race, a, b, place, rng } = setup();
    place(a, 0, 0, 10);
    a.lat = 0.1; // 前の子より右にいる側へいなされる
    place(b, 1.2, 0, 8);
    resolveContacts([a, b], race.course.points, 0, rng);
    expect(b.vx - a.vx).toBeCloseTo(0.05 * 2);
  });

  it("後ろの子に 1.5 m/s の横方向の速度が付く（前の子の右にいれば +z 側）", () => {
    const { race, a, b, place, rng } = setup();
    place(a, 0, 0, 10);
    a.lat = 0.1; // 前の子より右にいる側へいなされる
    place(b, 1.2, 0, 8);
    resolveContacts([a, b], race.course.points, 0, rng);
    expect(a.vz).toBeCloseTo(1.5);
  });

  it("追突では bump の出来事を出さない", () => {
    const { race, a, b, place, rng } = setup();
    place(a, 0, 0, 10);
    a.lat = 0.1; // 前の子より右にいる側へいなされる
    place(b, 1.2, 0, 8);
    expect(resolveContacts([a, b], race.course.points, 0, rng)).toEqual([]);
  });

  it("追突した子は前の子を追い抜くラインを選ぶ", () => {
    const { race, a, b, place, rng } = setup();
    place(a, 0, 0, 10);
    a.lat = 0.1; // 前の子より右にいる側へいなされる
    place(b, 1.2, 0, 8);
    resolveContacts([a, b], race.course.points, 0, rng);
    expect(a.passingIndex).toBe(b.index);
  });
});

describe("横からのぶつかり", () => {
  const sideBySide = () => {
    const ctx = setup();
    ctx.place(ctx.a, 0, 0, 0, 5);
    ctx.place(ctx.b, 0, 1.2, 0, -5);
    return ctx;
  };

  it("反発 0.55 で、離れる速さは接近速度の 55%", () => {
    const { race, a, b, rng } = sideBySide();
    resolveContacts([a, b], race.course.points, 0, rng);
    expect(b.vz - a.vz).toBeCloseTo(0.55 * 10);
  });

  it("衝撃が 2.2 を超えると bump を1件出す", () => {
    const { race, a, b, rng } = sideBySide();
    expect(resolveContacts([a, b], race.course.points, 0, rng)).toHaveLength(1);
  });

  it("衝撃が 2.2 以下なら bump を出さない", () => {
    const { race, a, b, place, rng } = setup();
    place(a, 0, 0, 0, 0.2);
    place(b, 0, 1.2, 0, -0.2);
    expect(resolveContacts([a, b], race.course.points, 0, rng)).toEqual([]);
  });

  it("重いほうが押し戻される量は少ない", () => {
    const { race, a, b, place, rng } = setup();
    a.physics = { ...a.physics, mass: 3 };
    b.physics = { ...b.physics, mass: 1 };
    place(a, 0, 0, 0);
    place(b, 0, 1, 0);
    resolveContacts([a, b], race.course.points, 0, rng);
    expect(Math.abs(a.z)).toBeLessThan(Math.abs(b.z - 1));
  });
});

describe("ジャンプ中", () => {
  it("重なっていても押し戻されない", () => {
    const { race, a, b, place, rng } = setup();
    place(a, 0, 0, 0);
    place(b, 0, 0.5, 0);
    a.jumpUntil = 1;
    resolveContacts([a, b], race.course.points, 0, rng);
    expect(b.z).toBe(0.5);
  });

  it("ジャンプが終われば押し戻される", () => {
    const { race, a, b, place, rng } = setup();
    place(a, 0, 0, 0);
    place(b, 0, 0.5, 0);
    a.jumpUntil = 1;
    resolveContacts([a, b], race.course.points, 1, rng);
    expect(b.z).toBeGreaterThan(0.5);
  });
});

describe("壁", () => {
  const limit = 11 / 2 - 0.75 * 0.9;

  it("壁の外へ出た分を押し戻す", () => {
    const { race, a, place } = setup();
    place(a, 0, limit + 0.3, 0);
    resolveWalls([a], race.course.points);
    expect(a.z).toBeCloseTo(limit);
  });

  it("壁へ向かう速度が ×1.45 で反転して ×0.96 になる", () => {
    const { race, a, place } = setup();
    place(a, 0, limit + 0.3, 10, 5);
    resolveWalls([a], race.course.points);
    expect(a.vz).toBeCloseTo(-5 * 0.45 * 0.96);
  });

  it("壁の中なら何もしない", () => {
    const { race, a, place } = setup();
    place(a, 0, limit - 0.1, 10, 5);
    resolveWalls([a], race.course.points);
    expect(a.vz).toBe(5);
  });
});
