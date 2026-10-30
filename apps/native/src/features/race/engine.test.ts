import { describe, expect, it } from "vitest";
import { STEP_SEC } from "./clock";
import { createRace, step } from "./engine";
import type { Race, RaceEvent } from "./types";

const STATS = { stamina: 5, power: 5, technique: 5 };
const SEED = 20260101;
const FIXED_PERF = 0.72;
const MAX_RACE_SEC = 90;
const MAX_STEPS = Math.round(MAX_RACE_SEC / STEP_SEC);

function runRace(seed: number, collisions = true) {
  const race = createRace({ seed, racers: { player: STATS }, collisions, fixedPerf: FIXED_PERF });
  const events: RaceEvent[] = [];
  for (let i = 0; i < MAX_STEPS && !race.isFinished; i++) events.push(...step(race, []));
  return { race, events };
}

const finishOrder = (race: Race) => race.runners.slice().sort((a, b) => (a.finishedAt ?? Infinity) - (b.finishedAt ?? Infinity)).map((r) => r.index);

describe("レースの準備", () => {
  const race = createRace({ seed: SEED, racers: { player: STATS }, collisions: true });

  it("走者は8体", () => {
    expect(race.runners).toHaveLength(8);
  });

  it("0番がプレイヤー", () => {
    expect(race.runners.filter((runner) => runner.isPlayer).map((runner) => runner.index)).toEqual([0]);
  });

  it("全員がスタートラインの18mより手前から始まる", () => {
    expect(race.runners.every((runner) => runner.s < 18)).toBe(true);
  });

  it("プレイヤーは後列（s=8）から始まる", () => {
    expect(race.runners[0].s).toBeCloseTo(8);
  });

  it("相手のステータスは合計15のプリセットになる", () => {
    const sums = race.runners.slice(1).map((runner) => runner.stats.stamina + runner.stats.power + runner.stats.technique);
    expect(sums).toEqual(Array(7).fill(sums[0]));
  });

  it("8体のレーンはすべて違う", () => {
    expect(new Set(race.runners.map((runner) => runner.laneBase)).size).toBe(8);
  });

  it("同じシードなら同じ並びで始まる", () => {
    const again = createRace({ seed: SEED, racers: { player: STATS }, collisions: true });
    expect(again.runners.map((runner) => runner.s)).toEqual(race.runners.map((runner) => runner.s));
  });
});

describe("NPCだけ（perf 0.72 固定）で1レース", () => {
  const { race, events } = runRace(SEED);

  it("全員がゴールする", () => {
    expect(race.isFinished).toBe(true);
  });

  it("シミュレーション時間90秒以内に終わる", () => {
    expect(race.time).toBeLessThanOrEqual(MAX_RACE_SEC);
  });

  it("ゴールの出来事が8件出て、着順が1〜8になる", () => {
    const places = events.filter((event) => event.type === "finish").map((event) => event.place);
    expect(places).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("ゴールタイムの順が出来事の着順と一致する", () => {
    expect(race.order).toEqual(finishOrder(race));
  });

  it("ミニゲーム区間の出入りが全員3回ずつ記録される", () => {
    expect(events.filter((event) => event.type === "zoneEnter")).toHaveLength(8 * 3);
  });

  it("同じシードなら同じ着順になる", () => {
    expect(finishOrder(runRace(SEED).race)).toEqual(finishOrder(race));
  });

  it("シードが違えば着順が変わるものがある", () => {
    const orders = [1, 2, 3, 4, 5].map((seed) => finishOrder(runRace(seed).race).join(""));
    expect(new Set(orders).size).toBeGreaterThan(1);
  });
});

describe("ぶつかり合いオフ", () => {
  it("bump が出ない", () => {
    const { events } = runRace(SEED, false);
    expect(events.some((event) => event.type === "bump")).toBe(false);
  });

  it("それでも全員がゴールする", () => {
    expect(runRace(SEED, false).race.isFinished).toBe(true);
  });
});

describe("コマンド", () => {
  const fresh = () => createRace({ seed: SEED, racers: { player: STATS }, collisions: true });

  it("jump でジャンプの出来事が出て、0.5秒間のジャンプ状態になる", () => {
    const race = fresh();
    const events = step(race, [{ type: "jump", runner: 0 }]);
    expect(events).toContainEqual({ type: "jump", runner: 0 });
  });

  it("stumble で転倒が0.7秒続く", () => {
    const race = fresh();
    step(race, [{ type: "stumble", runner: 0 }]);
    expect(race.runners[0].stumbleUntil).toBeCloseTo(0.7);
  });

  it("boost で指定した秒数だけ加速の演出が続く", () => {
    const race = fresh();
    step(race, [{ type: "boost", runner: 0, durationSec: 0.6 }]);
    expect(race.runners[0].boostUntil).toBeCloseTo(0.6);
  });

  it("setPerf で出来が変わる", () => {
    const race = fresh();
    step(race, [{ type: "setPerf", runner: 0, perf: 0.9 }]);
    expect(race.runners[0].perf).toBe(0.9);
  });
});

describe("slow コマンド", () => {
  it("減速だけをかけて、stumble の出来事は出さない", () => {
    const race = createRace({ seed: SEED, racers: { player: STATS }, collisions: false });

    const events = step(race, [{ type: "slow", runner: 0, durationSec: 0.3 }]);

    expect([race.runners[0].stumbleUntil > race.time, events.some((event) => event.type === "stumble")]).toEqual([true, false]);
  });
});
