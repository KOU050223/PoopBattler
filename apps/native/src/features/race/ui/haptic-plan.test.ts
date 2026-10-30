import { describe, expect, it } from "vitest";
import type { MinigameEvent, RaceEvent } from "../types";
import { createHapticGate, HAPTIC_MIN_INTERVAL_MS, hapticKindsOf } from "./haptic-plan";

const bump = (a: number, b: number): RaceEvent => ({ type: "bump", runners: [a, b], impulse: 1, x: 0, y: 0, z: 0 });

describe("hapticKindsOf", () => {
  it("自分が絡むぶつかりは bump、自分以外どうしは鳴らさない", () => {
    expect(hapticKindsOf([bump(0, 3)], [])).toEqual(["bump"]);
    expect(hapticKindsOf([bump(2, 3)], [])).toEqual([]);
  });

  it("自分の転倒は stumble、相手の転倒は鳴らさない", () => {
    expect(hapticKindsOf([{ type: "stumble", runner: 0 }, { type: "stumble", runner: 4 }], [])).toEqual(["stumble"]);
  });

  it("ハードルのパーフェクトは perfect、グッドは鳴らさない", () => {
    const perfect: MinigameEvent = { type: "hurdleResult", judge: "perfect", perf: 1 };
    const good: MinigameEvent = { type: "hurdleResult", judge: "good", perf: 0.65 };
    expect(hapticKindsOf([], [perfect, good])).toEqual(["perfect"]);
  });

  it("評価 S の区間終了は sRank、A は鳴らさない", () => {
    const end = (grade: "S" | "A"): MinigameEvent => ({ type: "end", zone: "dash", zoneIndex: 0, grade, average: 0.9 });
    expect(hapticKindsOf([], [end("S"), end("A")])).toEqual(["sRank"]);
  });

  it("連打は dashTap になる", () => {
    expect(hapticKindsOf([], [{ type: "dashTap" }])).toEqual(["dashTap"]);
  });
});

describe("createHapticGate", () => {
  it("同じ種類は最短間隔より短いと2回目を鳴らさず、ちょうど間隔があけば鳴らす", () => {
    const gate = createHapticGate();
    expect(gate.tryFire("dashTap", 1000)).toBe(true);
    expect(gate.tryFire("dashTap", 1000 + HAPTIC_MIN_INTERVAL_MS - 1)).toBe(false);
    expect(gate.tryFire("dashTap", 1000 + HAPTIC_MIN_INTERVAL_MS)).toBe(true);
  });

  it("毎秒9回の連打(約111ms間隔)を10回叩いても、鳴らす回数は半分ほどに減る", () => {
    const gate = createHapticGate();
    const fired = Array.from({ length: 10 }, (_, i) => gate.tryFire("dashTap", i * 111)).filter(Boolean);
    expect(fired.length).toBeLessThan(10);
    expect(fired.length).toBeGreaterThanOrEqual(5);
  });

  it("連打の直後でも、別の種類(ゴツン)は間引かれない", () => {
    const gate = createHapticGate();
    gate.tryFire("dashTap", 1000);
    expect(gate.tryFire("bump", 1010)).toBe(true);
  });

  it("間引かれた回は時刻を更新しないので、鳴らし続ける限り間隔が延びていかない", () => {
    const gate = createHapticGate();
    gate.tryFire("dashTap", 0);
    gate.tryFire("dashTap", 100);
    expect(gate.tryFire("dashTap", HAPTIC_MIN_INTERVAL_MS)).toBe(true);
  });
});
