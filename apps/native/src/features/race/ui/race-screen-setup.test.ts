import { describe, expect, it } from "vitest";
import { buildSessionOptions, DEFAULT_SETUP, OPPONENT_NAMES, PLAYER_NAME, seedOfClock, STAT_PRESETS } from "./race-screen-setup";

const TOTAL_STATS = 15;

describe("ステータスのプリセット", () => {
  it("どれも合計が15", () => {
    const totals = STAT_PRESETS.map(({ stats }) => stats.stamina + stats.power + stats.technique);

    expect(totals).toEqual(STAT_PRESETS.map(() => TOTAL_STATS));
  });

  it("試作と同じ5つが同じ順で並ぶ", () => {
    expect(STAT_PRESETS.map((preset) => preset.name)).toEqual(["バランス", "パワー型", "体力型", "技術型", "二刀流"]);
  });
});

describe("seedOfClock", () => {
  it("開始時刻が1ms違えばシードも違う", () => {
    expect(seedOfClock(1_761_800_000_000)).not.toBe(seedOfClock(1_761_800_000_001));
  });

  it("32bit の符号なし整数に収まる（表示した数字で再現できる）", () => {
    const seed = seedOfClock(1_761_800_000_123.7);

    expect(Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff).toBe(true);
  });
});

describe("buildSessionOptions", () => {
  it("選んだプリセットのステータスが自分に入る", () => {
    const options = buildSessionOptions({ presetId: "power", isCollisions: true }, 1);

    expect(options.racers.player).toEqual({ stamina: 4, power: 8, technique: 3 });
  });

  it("知らないプリセットの id は先頭のプリセットにする", () => {
    const options = buildSessionOptions({ presetId: "nothing", isCollisions: true }, 1);

    expect(options.racers.player).toEqual(STAT_PRESETS[0].stats);
  });

  it("ぶつかり合いのオン・オフがそのまま渡る", () => {
    expect(buildSessionOptions({ ...DEFAULT_SETUP, isCollisions: false }, 1).collisions).toBe(false);
  });

  it("名前は自分が先頭で、相手7人は重ならない", () => {
    const { runnerNames } = buildSessionOptions(DEFAULT_SETUP, 42);

    expect(runnerNames[0]).toBe(PLAYER_NAME);
    expect(new Set(runnerNames).size).toBe(8);
    expect(runnerNames.slice(1).every((name) => (OPPONENT_NAMES as readonly string[]).includes(name))).toBe(true);
  });

  it("同じシードなら同じ名前の並びになる", () => {
    expect(buildSessionOptions(DEFAULT_SETUP, 42).runnerNames).toEqual(buildSessionOptions(DEFAULT_SETUP, 42).runnerNames);
  });
});
