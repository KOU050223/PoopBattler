import { describe, expect, it } from "vitest";
import { createRace } from "./engine";
import { chooseLine, draftAmount, planOvertakes } from "./overtake";
import type { Runner } from "./types";

const STATS = { stamina: 5, power: 5, technique: 5 };
const SEED = 3;
const START_INDEX = 40;

function setup() {
  const race = createRace({ seed: SEED, racers: { player: STATS }, collisions: true });
  const [a, b, c] = race.runners;
  const place = (runner: Runner, s: number, lat: number, speed = 10) => {
    Object.assign(runner, { s, lat, vx: speed, vz: 0, trackIndex: START_INDEX, passingIndex: null, laneBase: 0 });
  };
  return { race, a, b, c, place };
}

describe("スリップストリーム", () => {
  const drafting = (gap: number, lateral = 0) => {
    const { a, b, place } = setup();
    place(a, 0, 0);
    place(b, gap, lateral);
    return draftAmount(a, [a, b]);
  };

  it("0.8m 未満では効かない", () => {
    expect(drafting(0.79)).toBe(0);
  });

  it("ちょうど 0.8m では最大の 1", () => {
    expect(drafting(0.8)).toBe(1);
  });

  it("0.8〜7m の真ん中（3.9m）では 0.5", () => {
    expect(drafting(3.9)).toBeCloseTo(0.5);
  });

  it("7m 超では効かない", () => {
    expect(drafting(7.01)).toBe(0);
  });

  it("横ずれが 1.3 を超えると効かない", () => {
    expect(drafting(3, 1.31)).toBe(0);
  });

  it("横ずれが 1.3 ちょうどなら効く", () => {
    expect(drafting(3, 1.3)).toBeGreaterThan(0);
  });

  it("ゴールした相手の後ろでは効かない", () => {
    const { a, b, place } = setup();
    place(a, 0, 0);
    place(b, 3, 0);
    b.finishedAt = 1;
    expect(draftAmount(a, [a, b])).toBe(0);
  });
});

describe("追い抜きAI", () => {
  it("6m以内の前方・横ずれ1.5以内の遅い相手を見つけたら、その子を追い抜き対象にする", () => {
    const { race, a, b, place } = setup();
    place(a, 0, 0, 10);
    place(b, 5, 1.4, 9);
    planOvertakes([a, b], race.course.points);
    expect(a.passingIndex).toBe(b.index);
  });

  it("相手が 6m より遠ければ追い抜き対象にしない", () => {
    const { race, a, b, place } = setup();
    place(a, 0, 0, 10);
    place(b, 6.1, 0, 9);
    planOvertakes([a, b], race.course.points);
    expect(a.passingIndex).toBeNull();
  });

  it("横ずれが 1.5 を超えれば追い抜き対象にしない", () => {
    const { race, a, b, place } = setup();
    place(a, 0, 0, 10);
    place(b, 3, 1.6, 9);
    planOvertakes([a, b], race.course.points);
    expect(a.passingIndex).toBeNull();
  });

  it("相手より 0.5 を超えて遅ければ追い抜き対象にしない", () => {
    const { race, a, b, place } = setup();
    place(a, 0, 0, 9.4);
    place(b, 3, 0, 10);
    planOvertakes([a, b], race.course.points);
    expect(a.passingIndex).toBeNull();
  });

  it("追い抜き中は、相手を 1.5m 抜くまで同じ相手を守る", () => {
    const { race, a, b, place } = setup();
    place(a, 0, 0);
    place(b, -1.4, 0);
    a.passingIndex = b.index;
    planOvertakes([a, b], race.course.points);
    expect(a.passingIndex).toBe(b.index);
  });

  it("相手を 1.5m 超えて抜いたら追い抜きを終える", () => {
    const { race, a, b, place } = setup();
    place(a, 0, 0);
    place(b, -1.6, 0);
    a.passingIndex = b.index;
    planOvertakes([a, b], race.course.points);
    expect(a.passingIndex).toBeNull();
  });

  it("9m を超えて離されたら追い抜きを諦める", () => {
    const { race, a, b, place } = setup();
    place(a, 0, 0);
    place(b, 9.1, 0);
    a.passingIndex = b.index;
    planOvertakes([a, b], race.course.points);
    expect(a.passingIndex).toBeNull();
  });

  it("相手の左右 1.8 のうち、他の子がいない側を選ぶ", () => {
    const { race, a, b, c, place } = setup();
    place(a, 0, 0);
    place(b, 4, 0);
    place(c, 3, -1.8);
    expect(chooseLine(a, b, [a, b, c], race.course.points)).toBeCloseTo(1.8);
  });

  it("壁際で候補が相手に近すぎるときは、反対側を選ぶ", () => {
    const { race, a, b, place } = setup();
    place(a, 0, 0);
    place(b, 4, 4.4);
    expect(chooseLine(a, b, [a, b], race.course.points)).toBeCloseTo(4.4 - 1.8);
  });
});
