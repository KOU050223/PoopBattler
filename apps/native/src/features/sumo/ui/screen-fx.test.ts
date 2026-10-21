import { describe, expect, it } from "vitest";
import { rayAngleDeg, screenFxPlan } from "./screen-fx";

const trigger = (hasFlash: boolean, speedLines: "none" | "parry" | "hit") => ({ id: 1, hasFlash, speedLines });

describe("screenFxPlan", () => {
  it("trigger が null のとき何も出さない", () => {
    expect(screenFxPlan(null, false)).toEqual({ flash: null, lines: null });
  });

  it("モーション軽減のときはフラッシュも集中線も出さない", () => {
    expect(screenFxPlan(trigger(true, "parry"), true)).toEqual({ flash: null, lines: null });
  });

  it("hasFlash が false ならフラッシュは出ない", () => {
    expect(screenFxPlan(trigger(false, "none"), false).flash).toBeNull();
  });

  it("hasFlash が true ならフラッシュが出る", () => {
    expect(screenFxPlan(trigger(true, "none"), false).flash).toEqual({ durationMs: 500, peakOpacity: 1 });
  });

  it("speedLines が none なら集中線は出ない", () => {
    expect(screenFxPlan(trigger(false, "none"), false).lines).toBeNull();
  });

  it("parry は hit より長く、強く、回転する", () => {
    const parry = screenFxPlan(trigger(false, "parry"), false).lines!;
    const hit = screenFxPlan(trigger(false, "hit"), false).lines!;
    expect(parry.durationMs).toBeGreaterThan(hit.durationMs);
    expect(parry.startOpacity).toBeGreaterThan(hit.startOpacity);
    expect(parry.endRotationDeg).toBeGreaterThan(hit.endRotationDeg);
  });
});

describe("rayAngleDeg", () => {
  it("先頭は 0 度", () => {
    expect(rayAngleDeg(0, 60)).toBe(0);
  });

  it("最後の1本は 360 度に届かない", () => {
    expect(rayAngleDeg(59, 60)).toBeLessThan(360);
  });
});
