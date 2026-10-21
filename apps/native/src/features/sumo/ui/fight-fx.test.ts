import { describe, expect, it } from "vitest";
import { SPECIES } from "../config";
import { newGame } from "../engine";
import { createRng } from "../rng";
import { emptyFxPlan, planFx, type FxPlan } from "../three/fx";
import { NO_SLOWMO, SLOWMO_MIN_SCALE, startSlowmo } from "../three/slowmo";
import { collectHotPositions, dispatchFxPlan, logicExtraScale, mergedFreezeMs, resultDelayMs } from "./fight-fx";
import { DEFAULT_SETUP } from "./session";

const parryPlan = (): FxPlan => ({ ...emptyFxPlan(), shake: 0.4, fovKick: 11, slowmoMs: 950, hasScreenFlash: true, speedLines: "parry", hitStopMs: 90, yawDelta: 0.35 });
const on3d = { view: "3d", isMotionReduced: false } as const;

describe("DEFAULT_SETUP", () => {
  it("表示の既定は 3D", () => {
    expect(DEFAULT_SETUP.view).toBe("3d");
  });
});

describe("dispatchFxPlan", () => {
  it("パリィの演出は全出力へ振り分ける", () => {
    const fx = dispatchFxPlan(parryPlan(), on3d);
    expect(fx).toMatchObject({ slowmoMs: 950, hitStopMs: 90, screenFx: { hasFlash: true, speedLines: "parry" } });
    expect(fx.stagePlan).toMatchObject({ shake: 0.4, fovKick: 11, yawDelta: 0.35 });
  });

  it("何も起きない計画はどこも発火しない", () => {
    expect(dispatchFxPlan(emptyFxPlan(), on3d)).toEqual({ stagePlan: null, shouldSpawnParticles: false, screenFx: null, slowmoMs: 0, hitStopMs: 0 });
  });

  it("粒子だけの計画は粒子だけ発火する", () => {
    const plan = { ...emptyFxPlan(), dusts: [{ position: { x: 0, y: 0, z: 0 }, count: 1, spread: 1, color: 0, seed: 1, delayMs: 0 }] };
    expect(dispatchFxPlan(plan, on3d)).toMatchObject({ stagePlan: null, shouldSpawnParticles: true, screenFx: null });
  });

  it("動きを減らす設定ではスローモー・揺れ・FOV キック・ScreenFx を止める", () => {
    const fx = dispatchFxPlan(parryPlan(), { view: "3d", isMotionReduced: true });
    expect(fx.slowmoMs).toBe(0);
    expect(fx.screenFx).toBeNull();
    expect(fx.stagePlan).toMatchObject({ shake: 0, fovKick: 0, slowmoMs: 0, yawDelta: 0.35 });
  });

  it("動きを減らす設定でもヒットストップは残す", () => {
    expect(dispatchFxPlan(parryPlan(), { view: "3d", isMotionReduced: true }).hitStopMs).toBe(90);
  });

  it("2D 表示では従来どおり何も発火しない", () => {
    expect(dispatchFxPlan(parryPlan(), { view: "2d", isMotionReduced: false })).toEqual({ stagePlan: null, shouldSpawnParticles: false, screenFx: null, slowmoMs: 0, hitStopMs: 0 });
  });

  it("実際の hit イベントの計画からヒットストップが出る", () => {
    const game = newGame({ speciesEast: SPECIES[0], speciesWest: SPECIES[1], diff: DEFAULT_SETUP.difficulty, mode: DEFAULT_SETUP.mode, rand: createRng(1), onEvent: () => undefined, npc: [false, true] });
    const plan = planFx({ type: "hit", attacker: 0, defender: 1, hitType: "tsuki", push: 10 }, game, createRng(2));
    expect(dispatchFxPlan(plan, on3d)).toMatchObject({ hitStopMs: 60, shouldSpawnParticles: true });
  });
});

describe("logicExtraScale", () => {
  const slowed = startSlowmo(NO_SLOWMO, 0, 1000);
  it("スローモー中は倍率が下がる", () => {
    expect(logicExtraScale(slowed, 400, on3d)).toBe(SLOWMO_MIN_SCALE);
  });
  it("動きを減らす設定では 1", () => {
    expect(logicExtraScale(slowed, 400, { view: "3d", isMotionReduced: true })).toBe(1);
  });
  it("2D では 1", () => {
    expect(logicExtraScale(slowed, 400, { view: "2d", isMotionReduced: false })).toBe(1);
  });
});

describe("resultDelayMs / mergedFreezeMs", () => {
  it("3D は 2D より結果画面までの間が長い", () => {
    expect(resultDelayMs("3d")).toBeGreaterThan(resultDelayMs("2d"));
  });
  it("ヒットストップは長い方を残す", () => {
    expect(mergedFreezeMs(120, 60)).toBe(120);
    expect(mergedFreezeMs(0, 60)).toBe(60);
  });
});

describe("collectHotPositions", () => {
  it("熱の力士だけ位置を返し、配列を使い回す", () => {
    const game = newGame({ speciesEast: SPECIES[0], speciesWest: SPECIES[1], diff: DEFAULT_SETUP.difficulty, mode: DEFAULT_SETUP.mode, rand: createRng(1), onEvent: () => undefined, npc: [false, true] });
    const out = [{ x: 9, y: 9, z: 9 }];
    expect(collectHotPositions(game, out)).toHaveLength(0);
    game.f[1].hot = 1;
    const result = collectHotPositions(game, out);
    expect(result).toBe(out);
    expect(result).toHaveLength(1);
  });
});
